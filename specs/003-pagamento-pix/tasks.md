# 003 — Tarefas

## Provedores
- [ ] T003.01 IMPL: tipos (PagamentoProvedor, StatusPagamento, ErroProvedorPagamento) — PAG-RF-01
      Arquivo: src/lib/pagamentos/tipos.ts · Depende de: 002 · Pronto quando: typecheck passa
- [ ] T003.02 [P] TESTE: compararSegredo (igual, diferente, tamanhos diferentes, vazio) — PAG-RF-12
      Arquivo: tests/pagamentos/seguranca.test.ts · Depende de: — · Pronto quando: falha
- [ ] T003.03 IMPL: src/lib/seguranca.ts — PAG-RF-12
      Arquivo: src/lib/seguranca.ts · Depende de: T003.02 · Pronto quando: T003.02 passa
- [ ] T003.04 [P] TESTE: provedor mock (formato BR Code com CRC16 válido, status inicial pendente, simular → pago, `permiteSimulacao`) — PAG-RF-03
      Arquivo: tests/pagamentos/mock.test.ts · Depende de: T003.01 · Pronto quando: falha
- [ ] T003.05 IMPL: src/lib/pagamentos/mock.ts (+ crc16 CCITT) — PAG-RF-03
      Arquivo: src/lib/pagamentos/mock.ts · Depende de: T003.04 · Pronto quando: T003.04 passa
- [ ] T003.06 [P] TESTE: adaptador AbacatePay com fetch falso (corpo e headers do create, check, simulate, mapeamento de status, erros 401 e `success:false`, timeout) — PAG-RF-04, CA-03, CA-04
      Arquivo: tests/pagamentos/abacatepay.test.ts · Depende de: T003.01 · Pronto quando: falha
- [ ] T003.07 IMPL: src/lib/pagamentos/abacatepay.ts — PAG-RF-04
      Arquivo: src/lib/pagamentos/abacatepay.ts · Depende de: T003.06 · Pronto quando: T003.06 passa
- [ ] T003.08 IMPL: getProvedorPagamento() + env (PAGAMENTO_PROVEDOR, ABACATEPAY_API_KEY, ABACATEPAY_DEV_MODE, ABACATEPAY_WEBHOOK_SECRET) — PAG-RF-02
      Arquivo: src/lib/pagamentos/provedor.ts, src/lib/env.ts, .env.example · Depende de: T003.05, T003.07 · Pronto quando: typecheck passa

## Cobrança
- [ ] T003.09 TESTE: garantirCobranca (cria, reutiliza a pendente, expira a vencida e recria, recusa pedido fora de aguardando, valor mínimo) + statusEfetivo — PAG-RF-05…07, CA-01, CA-02
      Arquivo: tests/pagamentos/cobranca.test.ts · Depende de: T003.05 · Pronto quando: falha
- [ ] T003.10 IMPL: src/lib/pagamentos/cobranca.ts — PAG-RF-05…07
      Arquivo: src/lib/pagamentos/cobranca.ts · Depende de: T003.09 · Pronto quando: T003.09 passa

## Confirmação
- [ ] T003.11 TESTE: confirmarPagamento idempotente (notifica 1×), caso pago após cancelamento — PAG-RF-08, CA-05, CA-06
      Arquivo: tests/pagamentos/confirmar.test.ts · Depende de: T003.10 · Pronto quando: falha
- [ ] T003.12 TESTE: reconciliarPagamento (pago → confirma; expirado/cancelado → atualiza; pendente → nada) — PAG-RF-09
      Arquivo: tests/pagamentos/confirmar.test.ts · Depende de: T003.11 · Pronto quando: falha
- [ ] T003.13 TESTE: simularPagamento (mock → pago; provedor sem simulação → erro; sem cobrança pendente → erro; retentativas com `esperar` falso) — PAG-RF-10, CA-07
      Arquivo: tests/pagamentos/confirmar.test.ts · Depende de: T003.11 · Pronto quando: falha
- [ ] T003.14 TESTE: reconciliarPendentesDoCliente (máx. 3, ignora expirados) — PAG-RF-11
      Arquivo: tests/pagamentos/confirmar.test.ts · Depende de: T003.11 · Pronto quando: falha
- [ ] T003.15 IMPL: src/lib/pagamentos/confirmar.ts — PAG-RF-08…11
      Arquivo: src/lib/pagamentos/confirmar.ts · Depende de: T003.11–T003.14 · Pronto quando: T003.11–T003.14 passam

## Webhook
- [ ] T003.16 TESTE: processarWebhookAbacatePay (401, dedup, id desconhecido → 200, payload "PAID" com check PENDING → não muda, sucesso → pago, erro interno → não marca como processado) — PAG-RF-12, PAG-RF-13, CA-08…CA-10
      Arquivo: tests/pagamentos/webhook.test.ts · Depende de: T003.15 · Pronto quando: falha
- [ ] T003.17 IMPL: src/lib/pagamentos/webhook.ts — PAG-RF-12, PAG-RF-13
      Arquivo: src/lib/pagamentos/webhook.ts · Depende de: T003.16 · Pronto quando: T003.16 passa
- [ ] T003.18 IMPL: rota POST /api/webhooks/abacatepay (casca fina) + teste de rota 401 — PAG-RF-12
      Arquivo: src/app/api/webhooks/abacatepay/route.ts, tests/pagamentos/webhook-rota.test.ts · Depende de: T003.17 · Pronto quando: teste passa

## Fechamento
- [ ] T003.19 VERIF: CA-01…CA-10 verdes; varredura por segredos em logs (grep por `console.` em src/lib/pagamentos) — PAG-RNF-01, PAG-RNF-02
      Depende de: todas · Pronto quando: ROADMAP atualizado, commit `feat(003)`
