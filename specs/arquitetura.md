# Arquitetura

## Visão geral

```
                          ┌──────────────────────────── máquina local (PoC) ────────────────────────────┐
Cliente (WhatsApp)        │                                                                              │
     │  ▲                 │   ngrok (domínio estático grátis)                                            │
     │  │                 │        │                                                                     │
     ▼  │                 │        ▼                                                                     │
Meta Cloud API ──webhook──┼──► Next.js :3000 ─────────────────────────┐                                  │
     ▲                    │     │  /api/webhooks/whatsapp (HMAC, dedup)│ encaminha msg normalizada        │
     │                    │     │  /api/webhooks/abacatepay (segredo)  ▼                                  │
     │                    │     │  /api/bot/*  ◄──── ferramentas ──── n8n :5678 (Docker, só localhost)   │
     │                    │     │  /admin (painel)                     │  ├ WhatsApp Entrada              │
     │                    │     │                                      │  ├ Agente Restaurante (Gemini)   │
     │   envia mensagens  │     │  notificar(status) ────────────────► │  ├ Chat Teste (sem WhatsApp)     │
     └────────────────────┼─────┼──────────────────────────────────────┘  └ Notificar Cliente             │
                          │     ▼                                         │                              │
                          │  libSQL (arquivo local.db)                    ▼                              │
                          │                                           Postgres (dados do n8n + memória)  │
                          └──────────────────────────────────────────────────────────────────────────────┘
                                 │                                        │
                                 ▼                                        ▼
                     AbacatePay API v2 (Pix dev)                  Gemini API (free tier)
```

## Componentes e responsabilidades

| Componente | É dono de | Não faz |
|---|---|---|
| **Next.js** (raiz do repo) | Regras de negócio, banco, API do bot, painel admin, gateway dos webhooks (Meta e AbacatePay), cobrança Pix | Enviar mensagem pela API da Meta; chamar LLM |
| **n8n** (Docker) | Conversa: prompt, LLM, memória, ferramentas; envio de mensagens WhatsApp | Acessar o banco da app; calcular preço |
| **libSQL/Turso** | Dados da app (cardápio, clientes, pedidos, pagamentos, eventos processados) | — |
| **Postgres** (Docker) | Banco interno do n8n + histórico de chat (Postgres Chat Memory) | Dados de negócio |
| **AbacatePay v2** | Gerar Pix (copia-e-cola + QR), status, simulação em dev, webhook | — |
| **Meta Cloud API** | Entregar e receber mensagens WhatsApp | — |
| **Gemini** | Modelo de linguagem do agente | — |
| **ngrok** | URL HTTPS pública e estável para o Next.js | Expor o n8n (nunca é exposto) |

## Fluxos

### F1. Mensagem do cliente → resposta do agente
1. A Meta envia `POST /api/webhooks/whatsapp`.
2. O Next.js valida `X-Hub-Signature-256`, descarta o que não é mensagem e as mensagens antigas (mais de 10 min), deduplica pelo `wamid` e responde `200` na hora.
3. Depois de responder (`after()`), o Next.js manda `POST n8n/webhook/whatsapp-entrada` com `{telefone, nome, tipo, texto, messageId}` e o header `x-webhook-secret`.
4. No n8n, o workflow "WhatsApp Entrada" segue por tipo:
   - mensagem que não é texto: responde "só leio texto";
   - texto: chama o sub-workflow "Agente Restaurante".
5. O agente:
   - busca `GET /api/bot/contexto` (cardápio, loja, cliente, pedidos recentes);
   - roda o LLM com memória e ferramentas;
   - separa o código Pix numa mensagem própria;
   - devolve `{mensagens: string[]}`.
6. "WhatsApp Entrada" envia cada mensagem, em ordem, pela Cloud API.

### F2. Pedido e Pix
1. O agente chama `POST /api/bot/pedidos/revisar` e recebe os itens validados e o total oficial.
2. O cliente confirma o resumo.
3. O agente chama `POST /api/bot/pedidos`, e o Next.js:
   - recalcula tudo;
   - faz o upsert do cliente;
   - grava o pedido em `aguardando_pagamento`;
   - chama `garantirCobranca`, que usa o AbacatePay `transparents/create` com `method: PIX`;
   - devolve o número do pedido, o total e o `brCode` (copia-e-cola).
4. O agente responde, e o código Pix vai sozinho numa mensagem separada.

### F3. Confirmação de pagamento (três gatilhos, um caminho)
Os três gatilhos levam à mesma `reconciliarPagamento()`. Ela consulta `GET transparents/check` e, se o status for `PAID`, chama `confirmarPagamento()`. Essa função é idempotente: muda o pedido para `pago` e notifica o cliente (F4).
- **Webhook do AbacatePay** (`?webhookSecret=`): usado só como gatilho.
- **Botão "Simular pagamento" / "Verificar pagamento" no admin.**
- **O cliente pergunta "já paguei?"**: `GET /api/bot/pedidos` reconcilia os pendentes antes de responder.

### F4. Notificação de status
1. O admin avança o status.
2. `alterarStatus()` valida a transição e chama `notificarCliente()`.
3. `notificarCliente()` faz `POST n8n/webhook/notificar-cliente` com `{telefone, mensagem}`; o n8n envia o WhatsApp.
4. Clientes do canal `teste` não recebem notificação. O envio é fire-and-forget: falha vai para o log e não desfaz a mudança de status.

## Decisões de arquitetura (ADRs)

**ADR-01 — n8n para a conversa, Next.js para as regras.** O usuário quer o fluxo visual e editável do n8n. A lógica crítica (dinheiro, status, segurança) fica em código testável no Next.js. *Consequência:* o n8n só faz orquestração; todo o resto passa pela API do bot.

**ADR-02 — WhatsApp Cloud API oficial (Meta).** Escolha do usuário em vez da Evolution API: é oficial e não tem risco de banimento. *Consequências:*
- é preciso um webhook HTTPS público (resolvido com o ngrok);
- o número de teste só fala com até 5 destinatários verificados;
- a resposta livre só vale dentro da janela de 24h (o bot sempre responde dentro dela).

**ADR-03 — Gateway do webhook da Meta no Next.js, não no n8n.** O plano original repassava `/webhooks/whatsapp` ao n8n por `rewrites`. Isso foi trocado por uma rota no Next.js que valida o HMAC sobre o raw body, deduplica e repassa ao n8n. *Motivos:*
- no n8n 2.x o nó Code roda em task runners, e o acesso ao raw body é frágil;
- o rewrite poderia alterar o corpo e quebrar a assinatura;
- no Next.js essa lógica é testável no Vitest.

*Consequências:* o n8n fica 100% privado, e os webhooks internos dele são protegidos por `N8N_WEBHOOK_SECRET`.

**ADR-04 — AbacatePay v2 (`/v2/transparents/*`); o webhook é só um gatilho.** O formato do `data` do evento `transparent.completed` não está bem documentado, e a resposta do `simulate-payment` não garante `PAID`. *Decisão:* o payload do webhook nunca é usado como verdade. Sempre se consulta `GET /v2/transparents/check?id=`. *Consequência:* a confirmação funciona mesmo sem webhook (botão Verificar, ou quando o cliente pergunta).

**ADR-05 — libSQL com arquivo local na PoC, Turso no deploy.** O mesmo cliente (`@libsql/client`) e a mesma ORM (Drizzle) funcionam com `file:./local.db` e com `libsql://...turso.io`. Os testes usam `:memory:`.

**ADR-06 — Contexto injetado no prompt.** O free tier do Gemini permite poucas requisições por minuto, e cada chamada de ferramenta custa uma requisição a mais. Por isso o cardápio, o estado da loja e os dados do cliente entram no system prompt a cada mensagem, com uma única chamada HTTP. Só sobram 3 ferramentas, que mexem em estado.

**ADR-07 — Gemini Flash no free tier, trocável.** O modelo fica configurável por `GEMINI_MODEL`. Trocar para Groq/Llama é substituir um nó de modelo no n8n. *Atenção:* no free tier o Google pode usar os prompts para treino, então a PoC usa apenas dados fictícios.

**ADR-08 — Polling no painel (5 s).** É mais simples que WebSocket ou SSE e funciona igual local e na Vercel. Com o volume de uma PoC, o custo é desprezível.

**ADR-09 — Identidade do cliente = telefone (wa_id).** No Chat Teste, o telefone é `teste:<sessionId>`. O canal é derivado desse prefixo, e o canal `teste` nunca recebe notificação.

## Variáveis de ambiente

Um único `.env` na raiz, lido pelo Next.js e pelo `docker compose`.

| Variável | Usada por | Descrição |
|---|---|---|
| `APP_URL` | Next | URL base do app (ex.: `http://localhost:3000`) |
| `DATABASE_URL` | Next | `file:./local.db` ou `libsql://<db>.turso.io` |
| `DATABASE_AUTH_TOKEN` | Next | Token do Turso (vazio no local) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Next | Login único do painel |
| `SESSION_SECRET` | Next | Chave HS256 do cookie de sessão (≥ 32 caracteres) |
| `BOT_API_KEY` | Next, n8n | Header `x-api-key` das rotas `/api/bot/*` |
| `N8N_URL` | Next | Como o Next alcança o n8n (`http://localhost:5678`) |
| `N8N_WEBHOOK_SECRET` | Next, n8n | Header `x-webhook-secret` dos webhooks internos do n8n |
| `NEXT_API_URL` | n8n | Como o n8n alcança o Next (`http://host.docker.internal:3000`) |
| `PAGAMENTO_PROVEDOR` | Next | `mock` ou `abacatepay` |
| `ABACATEPAY_API_KEY` | Next | Chave de API (modo dev) |
| `ABACATEPAY_WEBHOOK_SECRET` | Next | Valor esperado em `?webhookSecret=` |
| `ABACATEPAY_DEV_MODE` | Next | `true` (padrão) habilita o botão "Simular pagamento" |
| `WHATSAPP_VERIFY_TOKEN` | Next | Token de verificação do webhook na Meta |
| `WHATSAPP_APP_SECRET` | Next | Segredo do app Meta para validar o HMAC |
| `WHATSAPP_ACCESS_TOKEN` | n8n | Token da Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | n8n | ID do número remetente |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | n8n | ID da conta WhatsApp Business |
| `GEMINI_API_KEY` | n8n | Chave do Google AI Studio |
| `GEMINI_MODEL` | n8n | Padrão `gemini-flash-lite-latest` (Flash-Lite atual; maior cota diária no free tier) |
| `GEMINI_MODEL_RESERVA` | n8n | Modelo usado quando o principal falha (cota própria). Padrão `gemini-3.1-flash-lite` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | compose | Banco do n8n |
| `N8N_ENCRYPTION_KEY` | compose | Chave de criptografia das credenciais do n8n |
| `NGROK_AUTHTOKEN` / `NGROK_DOMAIN` | compose | Túnel público (profile `tunel`) |

## Segurança (resumo)

- O n8n fica ligado só em `127.0.0.1:5678`; o único ponto público é o Next.js, pelo túnel.
- Mecanismo de autenticação de cada ponto:

  | Ponto | Mecanismo |
  |---|---|
  | `/api/bot/*` | `x-api-key` |
  | `/api/webhooks/whatsapp` | HMAC SHA-256 |
  | `/api/webhooks/abacatepay` | segredo na query |
  | `/admin/*` e `/api/admin/*` | cookie JWT |

- Toda comparação de segredo é timing-safe.
- Tentativas de prompt injection não mexem em dinheiro (Princípio I) e o telefone vem do workflow, nunca do LLM.
