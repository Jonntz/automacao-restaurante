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
