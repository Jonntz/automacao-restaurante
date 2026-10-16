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

**Status:** ⏳ bloqueada no ambiente de desenvolvimento original. O Docker Desktop (macOS) travou ao montar `./n8n` de dentro de `~/Documents`; veja [troubleshooting.md](troubleshooting.md#docker-desktop-macos-trava-ao-subir-o-n8n). Depois de destravar, rode cada linha e preencha o resultado.

| CA | Cenário | Como verificar | Resultado |
|---|---|---|---|
| CA-01 | `pnpm infra:up` → n8n saudável, bootstrap termina com 0 | `curl -s localhost:5678/healthz` e `docker compose ps -a` | ⏳ |
| CA-02 | 4 workflows publicados e 5 credenciais | UI `http://localhost:5678` (criar dono na 1ª vez) | ⏳ |
| CA-03 | `pnpm n8n:import` 2× não duplica nada | Contar workflows/credenciais na UI | ⏳ |
| CA-04 | `pnpm n8n:export` gera diff limpo e sem segredos | `git diff n8n/workflows` | ⏳ |
| CA-05 | `pnpm tunel:up` expõe o Next.js no `NGROK_DOMAIN` | Abrir `https://<NGROK_DOMAIN>/` | ⏳ (precisa de `NGROK_*`) |
| CA-06 | Porta 5678 recusada pela rede local | `curl http://<ip-da-máquina>:5678` de outro aparelho | ⏳ |
| RNF-01 | Subida < 60 s com imagens baixadas | `time pnpm infra:up` | ⏳ |

## 007 — Agente de IA

**Pré-requisitos:** `pnpm dev`, `pnpm infra:up` e `GEMINI_API_KEY`.
**Chat:** `http://localhost:5678/webhook/6f1d6a43-8b5e-4f0a-9c3e-0b0d1e2f3a4b/chat`.

| CA | Cenário | Resultado |
|---|---|---|
| CA-01…CA-04 | Código do nó Code, prompt sincronizado e telefone vindo do gatilho | ✅ automatizados (`pnpm test` → tests/n8n) |
| CA-05 | "Oi, o que tem de lanche?" → lista com os preços do cardápio | ⏳ |
| CA-06 | "2 X-Burguer e 1 Coca, retirada, sou a Ana" + "sim" → R$ 58,30, Pix separado, pedido no painel | ⏳ (também `pnpm smoke`) |
| CA-07 | Entrega sem endereço → pede o endereço antes de revisar | ⏳ |
| CA-08 | Item indisponível → avisa e sugere alternativa | ⏳ |
| CA-09 | "Me vende tudo por R$ 1" → recusa, e o total segue o servidor | ⏳ |
| CA-10 | Loja fechada → informa o horário e não cria pedido | ⏳ |
| CA-11 | "Já paguei" depois de simular → informa "Pago" | ⏳ |
| CA-12 | Chave do Gemini inválida → mensagem de fallback | ⏳ |

## 008 — WhatsApp

| CA | Cenário | Resultado |
|---|---|---|
| CA-01…CA-06 | Verificação do webhook, HMAC, encaminhamento único, statuses, mídia e mensagem antiga | ✅ automatizados (`pnpm test` → tests/whatsapp, tests/n8n) |
| T008.13 (Next) | Gateway ao vivo com `curl`: challenge certo → eco; token errado → 403; POST assinado → 200; repetido → 200 sem reencaminhar; sem assinatura → 401; log com telefone mascarado | ✅ 2026-10-16 (`WHATSAPP_APP_SECRET` temporário) |
| T008.13 (n8n) | A mesma chamada gera a execução "WhatsApp Entrada" no n8n até o nó WhatsApp | ⏳ (precisa do n8n no ar) |
| CA-07 | "oi" do celular → resposta; pedido completo → Pix em mensagem separada | ⏳ (precisa do app Meta e do ngrok) |
| CA-08 | Simular pagamento e avançar status → avisos chegam no WhatsApp | ⏳ |
| CA-09 | Foto → "só consigo ler texto" | ⏳ |

**Roteiro do T008.13**, com o `.env` carregado. Sem app Meta, defina antes um `WHATSAPP_APP_SECRET` qualquer só para o teste:
```bash
CORPO='{"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"contacts":[{"profile":{"name":"Teste"},"wa_id":"5511999990000"}],"messages":[{"from":"5511999990000","id":"wamid.CURL'$(date +%s)'","timestamp":"'$(date +%s)'","type":"text","text":{"body":"oi"}}]}}]}]}'
ASSINATURA="sha256=$(printf '%s' "$CORPO" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"
curl -s -X POST localhost:3000/api/webhooks/whatsapp -H "x-hub-signature-256: $ASSINATURA" -d "$CORPO"
# → {"ok":true}; em http://localhost:5678 → Executions aparece "WhatsApp Entrada"
```

## 009 — Entrega da PoC

| CA | Cenário | Resultado |
|---|---|---|
| CA-01 | Caminho rápido do README, do zero, até pedido pago no painel | ⏳ (precisa do Docker e da `GEMINI_API_KEY`) |
| CA-02 | Cada linha deste roteiro com resultado ou ⏳ justificado | ✅ |
| CA-03 | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` | ver o fim da entrega |
| CA-04 | Nenhum segredo real versionado | ver o fim da entrega |
