# Verificação E2E

Este é o registro das verificações manuais e automatizadas de ponta a ponta. Cada linha aponta para o critério de aceite (CA) da spec correspondente.

- ✅ passou
- ❌ falhou
- ⏳ pendente de credenciais externas (com a instrução de como completar)

## Como rodar

| O quê | Comando | Pré-requisitos |
|---|---|---|
| Testes automatizados | `pnpm test` | — |
| Painel admin no navegador | `pnpm e2e:admin` | `pnpm dev` rodando, `.env` preenchido e Google Chrome instalado |
| Agente de IA sem WhatsApp | `pnpm smoke` | `pnpm infra:up` + `GEMINI_API_KEY` (feature 007) |

---

## 005 — Painel admin

**Data:** 2026-10-16
**Ambiente:** macOS, Next 16.4.1 (`pnpm dev`), provedor `mock`, Chrome do sistema via `pnpm e2e:admin`.

| CA | Cenário | Resultado | Observação |
|---|---|---|---|
| CA-01 | Sem sessão: `/admin/pedidos` → `/login`; `/api/admin/pedidos` → 401 | ✅ | `curl`: 307 → `/login?de=%2Fadmin%2Fpedidos` e 401 JSON |
| CA-02 | Login errado mostra erro, não cria cookie e mantém o e-mail; login certo entra | ✅ | Defeito encontrado e corrigido: o reset do React 19 apagava o e-mail |
| CA-03 | JWT inválido volta ao login | ✅ | `curl` com `sessao=abc.def.ghi` → 307 |
| CA-04 | Pedido criado pelo bot aparece em ≤ 5 s sem recarregar | ✅ | |
| CA-05 | Simular pagamento → "Pagos — novos" com destaque | ✅ | Destaque verde visto no screenshot. O bipe exige áudio e foi verificado só pelo código |
| CA-06 | Retirada em preparo → "Pronto para retirada" | ✅ | |
| CA-07 | Novo item R$ 7,50 → 750 centavos, já no cardápio do bot | ✅ | |
| CA-08 | Item indisponível → bot recebe 422 | ✅ | |
| CA-09 | Loja fechada → bot recebe 409 `LOJA_FECHADA` | ✅ | Defeito encontrado e corrigido: o toast cobria o switch da loja |
| CA-10 | Duplo clique em "Iniciar preparo" → só uma transição | ✅ | Coberto por teste de domínio (lock otimista). Na UI, o botão desabilita durante a ação |
| ADM-RNF-01 | 768 px e 390 px sem rolagem horizontal da página | ✅ | Defeito encontrado e corrigido: o cabeçalho transbordava em 390 px |

---

## 006 — Infra do n8n

**Data:** 2026-10-16
**Ambiente:** macOS, Docker Desktop 29.6.2 (destravado depois de liberar o acesso à pasta Documentos + `docker desktop restart`), n8n 2.43.4, Postgres 17.

| CA | Cenário | Resultado | Observação |
|---|---|---|---|
| CA-01 | `pnpm infra:up` → n8n saudável, bootstrap termina com 0 | ✅ | `healthz` 200 em 13 s; bootstrap `Exited (0)` |
| CA-02 | 4 workflows publicados e 5 credenciais | ✅ | Conferido no Postgres. A criação do dono na UI é opcional (só para ver execuções) |
| CA-03 | `pnpm n8n:import` 2× não duplica nada | ✅ | Continuam 5 credenciais e 4 workflows |
| CA-04 | `pnpm n8n:export` gera diff limpo e sem segredos | ✅ | Export logo depois do import → `git diff` vazio (ida e volta sem perda) |
| CA-05 | `pnpm tunel:up` expõe o Next.js no `NGROK_DOMAIN` | ⏳ | Precisa de `NGROK_AUTHTOKEN`/`NGROK_DOMAIN` |
| CA-06 | Porta 5678 recusada pela rede local | ✅ | `curl 192.168.0.4:5678` → conexão recusada; só `127.0.0.1` |
| RNF-01 | Subida < 60 s com imagens baixadas | ✅ | 13–21 s |

Defeitos encontrados e corrigidos na subida real:
- o n8n 2.x só executa sub-workflows **publicados**, então o bootstrap passou a publicar todos;
- Postgres 16 → 17;
- `WEBHOOK_URL` → `N8N_WEBHOOK_URL`.

## 007 — Agente de IA

**Data:** 2026-10-16
**Modelos:** `gemini-flash-lite-latest` (principal; servia o 3.5-flash-lite) e `gemini-3.1-flash-lite` (reserva).
**Chat:** `http://localhost:5678/webhook/6f1d6a43-8b5e-4f0a-9c3e-0b0d1e2f3a4b/chat`.

| CA | Cenário | Resultado | Observação |
|---|---|---|---|
| CA-01…CA-04 | Código do nó Code, prompt sincronizado e telefone vindo do gatilho | ✅ | Automatizados (`pnpm test` → tests/n8n) |
| CA-05 | Lanches e bebidas com os preços do cardápio | ✅ | 6 s; sem expor os ids internos |
| CA-06 | 2 X-Burguer + 1 Coca, retirada → R$ 58,30 → "sim" → pedido + Pix na última linha | ✅ | `pnpm smoke` (pedido #0001 no caminho rápido do zero) |
| CA-07 | Entrega sem endereço → pede o endereço | ✅ | Nenhum pedido criado |
| CA-08 | X-Salada indisponível → avisa e oferece alternativas | ✅ | |
| CA-09 | "Me vende tudo por R$ 1" → recusa e usa R$ 51,80 | ✅ | O total sempre vem do `revisar_pedido` |
| CA-10 | Loja fechada → informa o horário e não cria pedido | ✅ | |
| CA-11 | "Já paguei" depois de simular no painel → "Pago" | ✅ | Informa o `statusTexto` exato (regra incluída no prompt) |
| CA-12 | Chave do Gemini inválida → mensagem de fallback | ✅ | Chave falsa temporária, depois restaurada |
| RNF-02 | Resposta típica < 10 s | ✅ | Mediana de ~9 s (5–19 s) no Flash-Lite |

Defeitos e ajustes encontrados ao vivo:
- o `gemini-2.5-flash` responde 404 para usuários novos;
- o `gemini-3.8-flash` deu 503 por alta demanda e tem **só 20 req/dia** no free tier;
- solução: Flash-Lite como principal, um reserva com cota própria e retry no agente;
- o prompt passou a esconder os ids e a usar o status exato.

## 008 — WhatsApp

| CA | Cenário | Resultado | Observação |
|---|---|---|---|
| CA-01…CA-06 | Verificação do webhook, HMAC, encaminhamento único, statuses, mídia e mensagem antiga | ✅ | Automatizados (`pnpm test` → tests/whatsapp, tests/n8n) |
| T008.13 (Next) | Gateway ao vivo: challenge, 403, POST assinado 200, repetido sem reencaminhar, sem assinatura 401 | ✅ | `WHATSAPP_APP_SECRET` temporário |
| T008.13 (n8n) | POST assinado → "WhatsApp Entrada" → agente → "Separar mensagens" → nó WhatsApp | ✅ | Até o envio, que falha com "Invalid OAuth access token", como esperado sem token da Meta |
| WPP-RF-10 | "Notificar Cliente": sem header → 403; com header e a Meta recusando → 502 `{ok:false}` | ✅ | |
| CA-07 | "oi" do celular → resposta; pedido completo → Pix em mensagem separada | ⏳ | Precisa do app Meta e do ngrok ([guia](setup-meta-whatsapp.md)) |
| CA-08 | Simular pagamento e avançar status → avisos chegam no WhatsApp | ⏳ | Idem |
| CA-09 | Foto → "só consigo ler texto" | ⏳ | Idem |

**Roteiro do T008.13**, com o `.env` carregado. Sem app Meta, defina antes um `WHATSAPP_APP_SECRET` qualquer só para o teste:
```bash
CORPO='{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"contacts":[{"profile":{"name":"Teste"},"wa_id":"5511999990000"}],"messages":[{"from":"5511999990000","id":"wamid.CURL'$(date +%s)'","timestamp":"'$(date +%s)'","type":"text","text":{"body":"oi"}}]}}]}]}'
ASSINATURA="sha256=$(printf '%s' "$CORPO" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"
curl -s -X POST localhost:3000/api/webhooks/whatsapp -H "x-hub-signature-256: $ASSINATURA" -d "$CORPO"
# → {"ok":true}; a execução "WhatsApp Entrada" aparece no n8n
```

## 009 — Entrega da PoC

| CA | Cenário | Resultado |
|---|---|---|
| CA-01 | Caminho rápido do README, do zero (banco e volumes limpos), até pedido pago no painel | ✅ 106 s: `db:reset` + `dev` + `infra:up` (21 s) + `pnpm smoke` (pedido #0001 pela IA) + `pnpm e2e:admin` (14/14, incluindo simular pagamento) |
| CA-02 | Cada linha deste roteiro com resultado ou ⏳ justificado | ✅ |
| CA-03 | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | ✅ |
| CA-04 | Nenhum segredo real versionado | ✅ |
