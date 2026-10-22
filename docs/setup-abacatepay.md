# Configurar o Pix real em sandbox (AbacatePay, modo dev)

Por padrão, a PoC usa o provedor **`mock`**: ele gera um copia-e-cola fictício e o botão "Simular pagamento" confirma na hora. O código do mock **não é pagável**: a chave Pix dele (`mock@pix.invalid`) usa um domínio reservado que não pode existir, então qualquer app de banco recusa, e nenhum dinheiro sai da conta. Com o **AbacatePay em Dev mode**, o Pix passa a ser gerado pela API real, sem dinheiro de verdade, e a confirmação chega pelo webhook.

> A integração usa a **API v2** (`/v2/transparents/*`), conferida na documentação oficial em 2026-10-16: <https://docs.abacatepay.com>.

## 1. Conta e chave
1. Crie a conta em <https://www.abacatepay.com>. Não há custo; as taxas só valem para pagamentos reais em produção.
2. No painel, deixe o **Dev mode** ligado.
3. Em **Integrações / API**, crie uma chave com as permissões **`TRANSPARENT:CREATE`** e **`TRANSPARENT:READ`**.
4. No `.env`:
   ```env
   PAGAMENTO_PROVEDOR=abacatepay
   ABACATEPAY_API_KEY=<sua chave de dev>
   ABACATEPAY_DEV_MODE=true
   ```
5. Reinicie o `pnpm dev`.

## 2. Webhook (opcional, mas recomendado)
O webhook serve só de **gatilho**: ao receber o evento, o sistema **consulta de novo** o status da cobrança na API e nunca confia no conteúdo do payload (ADR-04). Sem webhook, a confirmação ainda acontece de dois jeitos:
- pelo botão **Verificar** no painel;
- quando o cliente pergunta "já paguei?" ao bot.

1. Suba o túnel: `pnpm tunel:up` (veja o passo 5 de [setup-meta-whatsapp.md](setup-meta-whatsapp.md)).
2. No painel do AbacatePay, **em Dev mode**, crie um webhook:
   - **URL:** `https://<NGROK_DOMAIN>/api/webhooks/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET do .env>`
   - **Secret:** o mesmo valor de `ABACATEPAY_WEBHOOK_SECRET`
   - **Evento:** `transparent.completed`

## 3. Testar
1. Faça um pedido, pelo Chat Teste do n8n ou pelo WhatsApp. O Pix devolvido agora é um BR Code real de sandbox.
2. No painel, clique em **Simular pagamento**:
   - o sistema chama `POST /v2/transparents/simulate-payment` e depois consulta `GET /v2/transparents/check`;
   - se o status vier `PAID`, o pedido vai para **Pagos — novos** e o cliente recebe a confirmação;
   - se o sandbox demorar, aparece "Simulação enviada": o webhook ou o botão **Verificar** concluem depois.
3. Webhooks repetidos são ignorados: a deduplicação usa o `id` do evento.

## Problemas comuns
| Sintoma | Solução |
|---|---|
| "PAGAMENTO_PROVEDOR=abacatepay exige ABACATEPAY_API_KEY" | Preencha a chave e reinicie o `pnpm dev` |
| Bot responde "não consegui gerar o Pix agora" | Veja o log do Next.js (`AbacatePay recusou…`): chave inválida, sem permissão `TRANSPARENT:CREATE`, ou valor abaixo de R$ 1,00 |
| Webhook com 401 | O `webhookSecret` da URL é diferente de `ABACATEPAY_WEBHOOK_SECRET` |
| "O provedor de pagamento atual não permite simulação" | `ABACATEPAY_DEV_MODE=false`; em produção não existe simulação |
