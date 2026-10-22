# 003 — Pagamento Pix

## Objetivo
Gerar a cobrança Pix de cada pedido e confirmar o pagamento de forma **confiável e idempotente**. Isso tem que funcionar sem conta em gateway (provedor `mock`) e com o AbacatePay em modo dev, em que o pagamento é simulado.

## Histórias
- **H1.** Como cliente, quero receber um Pix copia-e-cola assim que confirmo o pedido.
- **H2.** Como restaurante, quero que o pedido vá para "Pago" sozinho quando o Pix cair, sem chance de confirmar duas vezes.
- **H3.** Como quem demonstra a PoC, quero um botão "Simular pagamento" para mostrar o fluxo completo sem dinheiro real.
- **H4.** Como dev, quero rodar tudo sem conta no AbacatePay (provedor `mock`).

## Requisitos funcionais

### Provedores
- **PAG-RF-01** — A interface `PagamentoProvedor` tem estas operações:
  - `criarCobranca({ pedidoId, valorCentavos, descricao, expiraEmSegundos })` devolve `{ provedorId, copiaECola, qrCodeBase64?, expiraEm, status }`;
  - `consultarStatus(provedorId)` devolve `StatusPagamento`;
  - `simularPagamento?(provedorId)`, opcional e só para dev;
  - `permiteSimulacao: boolean`.
- **PAG-RF-02** — `getProvedorPagamento()` escolhe o provedor por `PAGAMENTO_PROVEDOR`:
  - `mock` é o padrão;
  - `abacatepay` exige `ABACATEPAY_API_KEY`; sem ela, falha na inicialização com mensagem clara.
- **PAG-RF-03** — Provedor **mock**:
  - gera um `provedorId` `mock_<uuid>` e um copia-e-cola fictício que **começa com `000201`** e **termina com `6304` + 4 hex**, no formato BR Code, para exercitar a separação do Pix no n8n;
  - a chave Pix dentro do código usa um domínio **reservado e impossível de registrar** (`mock@pix.invalid`, TLD `.invalid` da RFC 2606). Nenhuma chave real pode coincidir, então um app de banco sempre recusa o código, e não há risco de pagamento acidental para terceiros;
  - guarda o estado em memória (sobrevive ao HMR via `globalThis`);
  - `simularPagamento` marca o pagamento como pago; `permiteSimulacao = true`.
- **PAG-RF-04** — Provedor **AbacatePay** (API v2, `https://api.abacatepay.com/v2`, `Authorization: Bearer`):
  - `criarCobranca` faz `POST /transparents/create` com `{ method: "PIX", data: { amount, expiresIn, description, externalId: "pedido-<id>-<timestamp>", metadata: { pedidoId } } }` e lê `brCode`, `brCodeBase64`, `expiresAt` e `id`;
  - `consultarStatus` faz `GET /transparents/check?id=`;
  - `simularPagamento` faz `POST /transparents/simulate-payment?id=`;
  - `permiteSimulacao` vale `ABACATEPAY_DEV_MODE !== "false"` (padrão `true`). Em produção o provedor recusa a simulação, e o erro dele aparece para o admin;
  - mapeamento de status:

    | Status AbacatePay | Status interno |
    |---|---|
    | `PAID`, `APPROVED` | `pago` |
    | `EXPIRED` | `expirado` |
    | `CANCELLED`, `REFUNDED`, `FAILED` | `cancelado` |
    | demais | `pendente` |

  - HTTP fora de 2xx ou `success: false` lança `ErroProvedorPagamento` com a mensagem do provedor. O timeout é de 10 s.
- **PAG-RF-05** — O valor mínimo de cobrança é R$ 1,00 (exigência do AbacatePay). Pedido abaixo disso gera erro claro (o cardápio demo não permite isso).

### Ciclo da cobrança
- **PAG-RF-06** — `garantirCobranca(db, pedidoId, { provedor, agora })` é idempotente:
  - pedido inexistente ou fora de `aguardando_pagamento` gera erro;
  - se já existe um pagamento `pendente` e não expirado, ele é devolvido sem chamar o provedor;
  - senão, os pendentes vencidos são marcados como `expirado`, uma cobrança nova é criada (valor = `total_centavos`, expiração de 30 min, descrição `"Pedido #0012 - <nome da loja>"`) e gravada.
- **PAG-RF-07** — `statusEfetivo(pagamento, agora)` devolve `expirado` se o pagamento está `pendente` e `agora > expira_em`; senão, o status gravado.
- **PAG-RF-08** — `confirmarPagamento(db, pagamentoId, { notificador, agora })`, **idempotente**:
  - se já está `pago`, devolve `{ mudou: false }` e não notifica;
  - senão, marca `pago` + `pago_em` e chama `alterarStatus(pedido, 'pago', { origem: 'pagamento' })`, que notifica o cliente;
  - se o pedido está `cancelado`, registra o pagamento, mantém o pedido cancelado e devolve `{ mudou: true, alerta: 'PAGO_APOS_CANCELAMENTO' }`. O estorno é manual e está fora de escopo.
- **PAG-RF-09** — `reconciliarPagamento(db, pagamentoId, deps)`:
  - consulta o provedor;
  - se o resultado é `pago`, chama `confirmarPagamento`;
  - se é `expirado` ou `cancelado`, atualiza o status do pagamento;
  - devolve o status final.

  É o **único caminho** até a confirmação (ADR-04).
- **PAG-RF-10** — `simularPagamento(db, pedidoId, deps)`:
  - exige que o provedor permita simulação e que exista uma cobrança pendente;
  - chama `provedor.simularPagamento`;
  - depois chama `reconciliarPagamento` até 3 vezes, com 1 s de intervalo, até receber `pago`;
  - devolve o status final; `pendente` ainda é aceitável, porque o webhook ou o polling resolvem depois.
- **PAG-RF-11** — `reconciliarPendentesDoCliente(db, telefone, deps)` reconcilia no máximo 3 pagamentos pendentes não expirados do cliente. A feature 004 usa isso para responder "já paguei?".

### Webhook
- **PAG-RF-12** — Rota `POST /api/webhooks/abacatepay?webhookSecret=…`:
  - compara o segredo com `ABACATEPAY_WEBHOOK_SECRET` de forma timing-safe; se não bate, devolve **401**;
  - lê o envelope `{ id, event, devMode, data }`;
  - deduplica por `eventos_processados("abacatepay:<id>")`; repetido devolve **200** `{ ok: true, duplicado: true }`;
  - extrai o id da cobrança de `data.id ?? data.transparent?.id ?? data.pixQrCode?.id ?? data.billing?.id`;
  - se acha o pagamento por `provedor_id`, chama `reconciliarPagamento`; se não acha, registra no log e devolve **200** (para não gerar retentativas infinitas);
  - falha interna devolve **500**, para o provedor tentar de novo, e **não** marca o evento como processado.
- **PAG-RF-13** — O conteúdo do payload **nunca** é usado para decidir o status: o estado vem sempre de `consultarStatus` (Constituição VI).

## Requisitos não funcionais
- **PAG-RNF-01** — Chaves e segredos nunca aparecem em logs ou em respostas.
- **PAG-RNF-02** — Os testes do AbacatePay usam `fetch` falso; nenhum teste automatizado chama a rede.

## Critérios de aceite
- **CA-01** — Dado o provedor mock, quando garanto a cobrança de um pedido, então gravo um pagamento `pendente` com copia-e-cola `000201…6304XXXX` e expiração de 30 min, cuja chave Pix termina em `.invalid`. Chamar de novo devolve o **mesmo** pagamento sem criar outro.
- **CA-02** — Dada uma cobrança vencida, quando garanto a cobrança, então a antiga vira `expirado` e uma nova é criada.
- **CA-03** — Dado o fetch falso do AbacatePay, quando crio uma cobrança, então o corpo enviado tem `method: "PIX"`, `amount` igual ao total do pedido e `expiresIn: 1800`, e o header leva o Bearer.
- **CA-04** — Dado o AbacatePay respondendo 401 ou `success: false`, quando crio uma cobrança, então recebo `ErroProvedorPagamento`.
- **CA-05** — Dado um pagamento pendente, quando chamo `confirmarPagamento` duas vezes, então o pedido vai para `pago` uma vez e o notificador é chamado **uma** vez.
- **CA-06** — Dado um pedido cancelado, quando o pagamento é confirmado, então o pedido continua `cancelado` e o alerta `PAGO_APOS_CANCELAMENTO` é devolvido.
- **CA-07** — Dado o provedor mock, quando simulo o pagamento, então o pedido termina em `pago`.
- **CA-08** — Dado um webhook com segredo errado, então a resposta é 401. Com o segredo certo e um evento repetido, a segunda chamada devolve `duplicado: true` e não reconcilia de novo.
- **CA-09** — Dado um webhook válido cujo payload diz "PAID", mas o provedor responde `PENDING` no `check`, então o pedido **não** muda (ADR-04).
- **CA-10** — Dado um webhook válido para um id desconhecido, então a resposta é 200 e nada muda.

## Fora de escopo
Estorno, Pix com CPF do pagador, outros meios de pagamento, cron de expiração, validação HMAC do `X-Webhook-Signature` (a documentação não deixa claro qual chave assina; o segredo na URL + reconsulta cobrem o risco na PoC).

## Histórico
- 2026-10-16 — versão inicial (API v2 do AbacatePay verificada na documentação oficial).
- 2026-10-22 — A chave Pix do mock passou de `mock@containerlanches.dev` para `mock@pix.invalid`. O domínio antigo não existia, mas poderia ser registrado por alguém e virar uma chave real. Com o TLD reservado `.invalid`, isso nunca acontece (pedido do usuário).
