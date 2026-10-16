# 003 — Plano técnico

## Arquivos
```
src/lib/pagamentos/
  tipos.ts           # PagamentoProvedor, StatusPagamento, CobrancaCriada, ErroProvedorPagamento
  mock.ts            # criarProvedorMock() — estado em globalThis.__pagamentosMock
  abacatepay.ts      # criarProvedorAbacatePay({ apiKey, fetch, baseUrl })
  provedor.ts        # getProvedorPagamento() (lê env, cache)
  cobranca.ts        # garantirCobranca, statusEfetivo
  confirmar.ts       # confirmarPagamento, reconciliarPagamento, simularPagamento, reconciliarPendentesDoCliente
  webhook.ts         # processarWebhookAbacatePay(db, { segredoRecebido, corpo }, deps) — lógica pura da rota
src/app/api/webhooks/abacatepay/route.ts   # casca HTTP fina → webhook.ts
src/lib/seguranca.ts                       # compararSegredo (timingSafeEqual com tamanhos diferentes)
tests/pagamentos/{mock,abacatepay,cobranca,confirmar,webhook}.test.ts
```

## Contrato AbacatePay v2 (docs oficiais, conferido em 2026-10-16)
- `POST /v2/transparents/create`: corpo `{ method: "PIX", data: { amount (centavos, ≥ 100), expiresIn (s), description (≤ 500), externalId, metadata } }` e resposta `{ data: { id, amount, status, devMode, brCode, brCodeBase64, expiresAt, … }, error, success }`.
- `GET /v2/transparents/check?id=`: resposta `{ data: { id, status, expiresAt }, error, success }`.
- `POST /v2/transparents/simulate-payment?id=`: sem corpo, funciona só em dev mode. A resposta pode vir `PENDING`.
- Webhook: envelope `{ id, event, apiVersion, devMode, data }`, evento de PIX pago `transparent.completed`, segredo via `?webhookSecret=` e retentativas com o mesmo `id`.

## Decisões
- **Rota fina, lógica testável:** `route.ts` só lê `searchParams` + `request.json()` e delega para `processarWebhookAbacatePay`, que recebe `db`, `provedor`, `notificador` e `agora`. Os testes cobrem a função pura e um teste de rota cobre o 401.
- **Dedup do webhook:** o `insert` em `eventos_processados` acontece **depois** do processamento ter sucesso. Uma checagem `select` prévia faz o curto-circuito. Em caso de erro, nada é gravado, e o provedor tenta de novo.
- **`permiteSimulacao` no AbacatePay:** o campo `devMode` da criação não é persistido, para evitar mudar o schema. O admin mostra o botão "Simular pagamento" quando `PAGAMENTO_PROVEDOR` é `mock`, ou `abacatepay` com a chave `ABACATEPAY_DEV_MODE` diferente de `false`. Em produção o provedor recusa, e o erro aparece num toast.
  - A chave `ABACATEPAY_DEV_MODE` (default `true`) entra no `.env.example`.
- **Copia-e-cola do mock:** `00020126…5204000053039865802BR5911BURGER DEMO6009SAO PAULO62…6304` + CRC16 real calculado. Assim o código parece de verdade, e a regex do n8n é exercitada.
- **Retentativas do `simularPagamento`:** o `sleep` é injetável (`deps.esperar`), para os testes não demorarem.

## Riscos
- O formato de `data` no webhook pode variar. A função tenta vários caminhos e, se não achar o id, registra o envelope no log sem segredos. A confirmação ainda acontece pelo botão Verificar ou quando o cliente pergunta.
