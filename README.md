# 🍔 Burger Demo — Automação de restaurante (PoC)

Atendente com **IA no WhatsApp** que mostra o cardápio, monta o pedido, cobra via **Pix** e entrega cada pedido num **painel de gestão** em tempo quase real. Tudo roda com **camadas gratuitas**.

- **Cliente:** conversa em PT-BR pelo WhatsApp (ou pelo chat de teste) e recebe o código Pix numa mensagem própria, fácil de copiar.
- **Restaurante:** acompanha os pedidos num kanban (aguardando → pago → em preparo → saiu/pronto → concluído), simula pagamentos, mantém o cardápio e abre ou fecha a loja.
- **Regra de ouro:** a IA **nunca** define preço. Ela só informa IDs de itens e quantidades, e o servidor calcula tudo em centavos a partir do banco.

## Arquitetura

```
WhatsApp ─► Meta Cloud API ─► (ngrok) ─► Next.js ──► libSQL/Turso
                                          │  ▲
                 mensagem validada (HMAC) │  │ /api/bot/* (cardápio, revisar, criar, consultar)
                                          ▼  │
                                n8n (Docker) — agente Gemini + memória Postgres
                                          │
                                          └─► Meta Cloud API ─► WhatsApp (respostas e avisos de status)
Pix: Next.js ⇄ AbacatePay v2 (dev) — ou provedor "mock" sem conta nenhuma
```

- **Next.js** é dono das regras, do banco, do painel e dos webhooks.
- **n8n** é dono da conversa (LLM, memória, ferramentas) e do envio de mensagens.
- Detalhes e decisões (ADRs) em [specs/arquitetura.md](specs/arquitetura.md).

| Peça | Tecnologia (versão fixada) | Custo |
|---|---|---|
| App, API e painel | Next.js 16.4.1 (App Router, Cache Components), Tailwind 4, shadcn/ui | — |
| Banco | Drizzle 0.45 + libSQL (`file:` local / Turso) | Turso free |
| Orquestração da IA | n8n 2.43.4 + Postgres 17 (Docker) | self-hosted |
| Modelo | Google Gemini Flash (free tier), trocável por Groq | grátis |
| WhatsApp | Cloud API oficial da Meta (número de teste) | grátis |
| Pix | AbacatePay API v2 (dev mode) ou `mock` | grátis |
| Túnel | ngrok 3.39 (domínio estático gratuito) | grátis |

## Pré-requisitos
- Node.js **22+** e **pnpm 11**
- **Docker Desktop** (para o n8n)
- Google Chrome (só para o teste E2E `pnpm e2e:admin`)

## Caminho rápido (~15 min, sem WhatsApp e sem gateway de pagamento)
Só é preciso a chave gratuita do Gemini ([como criar](docs/setup-gemini.md)).

```bash
pnpm install
pnpm env:init                 # cria o .env com segredos aleatórios e mostra o login do painel
# edite o .env e preencha GEMINI_API_KEY
pnpm db:reset                 # banco local + cardápio demo (Burger Demo)
pnpm dev                      # http://localhost:3000
pnpm infra:up                 # em outro terminal: Postgres + n8n (importa e publica os workflows)
```

1. Abra <http://localhost:5678> e crie o usuário dono do n8n (só na 1ª vez). Confira os workflows **Agente Restaurante**, **Chat Teste**, **WhatsApp Entrada** e **Notificar Cliente**.
2. Abra o **Chat Teste**: <http://localhost:5678/webhook/6f1d6a43-8b5e-4f0a-9c3e-0b0d1e2f3a4b/chat>
3. Converse: *"quero 2 x-burguer e uma coca lata para retirada, meu nome é Ana"* e depois *"sim"*. O código Pix chega sozinho na última mensagem.
4. Abra <http://localhost:3000/admin> (login exibido pelo `env:init`). O pedido está em **Aguardando pagamento**: clique em **Simular pagamento** e ele vai para **Pagos — novos**.
5. Avance o pedido pelo kanban, ou rode a conversa roteirizada: `pnpm smoke`.

> Se o `pnpm infra:up` travar no macOS, veja [troubleshooting](docs/troubleshooting.md#docker-desktop-macos-trava-ao-subir-o-n8n) (permissão do Docker para a pasta Documentos).

## Caminho completo (WhatsApp real + Pix sandbox)
1. **WhatsApp:** [docs/setup-meta-whatsapp.md](docs/setup-meta-whatsapp.md). Envolve o app na Meta, o número de teste, o token, o ngrok e o webhook `https://<NGROK_DOMAIN>/api/webhooks/whatsapp`.
2. **Pix sandbox:** [docs/setup-abacatepay.md](docs/setup-abacatepay.md). Envolve `PAGAMENTO_PROVEDOR=abacatepay`, a chave de dev e o webhook opcional.
3. **Na nuvem (opcional):** [docs/deploy.md](docs/deploy.md), com Vercel + Turso + VM Always Free da Oracle.

## Scripts
| Comando | O que faz |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm test` | Vitest: domínio, API, webhooks, workflows do n8n (banco em memória) |
| `pnpm typecheck` / `pnpm lint` | Tipos (com `next typegen`) e ESLint |
| `pnpm e2e:admin` | Painel no Chrome real: login, kanban, simular, cardápio, loja, responsividade |
| `pnpm smoke` | Conversa roteirizada com o agente pelo Chat Teste (precisa de n8n + Gemini) |
| `pnpm env:init` | Cria o `.env` com segredos aleatórios (nunca sobrescreve) |
| `pnpm db:migrate` / `db:seed` / `db:reset` | Banco (o `reset` só apaga banco `file:`) |
| `pnpm db:generate` | Gera a migration a partir do schema Drizzle |
| `pnpm infra:up` / `infra:down` / `infra:logs` / `infra:reset` | Postgres + n8n via Docker |
| `pnpm n8n:import` / `pnpm n8n:export` | Workflows: git → n8n / n8n → git (com checagem de segredos) |
| `pnpm tunel:up` | ngrok expondo o `:3000` no `NGROK_DOMAIN` |

## Estrutura
```
specs/                 # Spec-Driven Development: constituição, arquitetura, ROADMAP e 9 features
src/app/               # páginas (/admin, /login) e rotas (/api/bot, /api/admin, /api/webhooks)
src/lib/               # domínio: pedidos, pagamentos, notificações, whatsapp, bot, admin, db
n8n/workflows/         # workflows versionados (IDs fixos em n8n/ids.json)
n8n/prompts/           # system prompt do atendente (fonte da verdade)
n8n/bootstrap/         # gera credenciais do .env, importa e publica workflows
scripts/               # db, env:init, smoke, e2e:admin, n8n:export
tests/                 # Vitest
docs/                  # guias de setup, deploy, troubleshooting e o roteiro E2E
```

## Como o projeto é desenvolvido
O projeto segue **Spec-Driven Development**: cada feature tem `spec.md` (o quê/por quê), `plan.md` (como) e `tasks.md` (passo a passo rastreável). Comece por [specs/README.md](specs/README.md) e pela [constituição](specs/constitution.md). O progresso está em [specs/ROADMAP.md](specs/ROADMAP.md), e o resultado das verificações em [docs/verificacao-e2e.md](docs/verificacao-e2e.md).

## Limites conhecidos da PoC
- Um único restaurante; só pedidos com Pix; só mensagens de texto.
- Sem templates do WhatsApp: os avisos funcionam dentro da janela de 24 h após a última mensagem do cliente.
- O free tier do Gemini tem poucas requisições por minuto, e os prompts podem ser usados para treino: **use dados fictícios**.
- Vercel Hobby é só para uso não comercial.
