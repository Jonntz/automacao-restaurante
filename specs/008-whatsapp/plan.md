# 008 — Plano técnico

## Arquivos
```
src/lib/whatsapp/
  assinatura.ts       # validarAssinaturaMeta(corpoBruto, header, appSecret)
  parse.ts            # extrairMensagens(payload, agora) → MensagemNormalizada[] (filtra statuses, antigas)
  gateway.ts          # processarWebhookWhatsapp(db, { corpoBruto, assinatura }, deps) → { status, encaminhar: Mensagem[] }
  encaminhar.ts       # encaminharParaN8n(mensagens, { n8nUrl, segredo, fetch })
src/app/api/webhooks/whatsapp/route.ts   # GET verify; POST → gateway → after(encaminhar)
n8n/workflows/whatsapp-entrada.json
n8n/workflows/notificar-cliente.json
tests/whatsapp/{assinatura,parse,gateway,rota}.test.ts
tests/n8n/whatsapp.test.ts                # estrutura dos workflows: header auth, IF, ordem, phoneNumberId via $env
tests/fixtures/meta/*.json                # payloads reais de exemplo (texto, áudio, statuses, múltiplas)
docs/setup-meta-whatsapp.md
```

## Payload de exemplo da Meta (texto)
```json
{ "object": "whatsapp_business_account",
  "entry": [{ "id": "WABA_ID", "changes": [{ "field": "messages", "value": {
    "messaging_product": "whatsapp",
    "metadata": { "display_phone_number": "15551234567", "phone_number_id": "PNID" },
    "contacts": [{ "profile": { "name": "Ana" }, "wa_id": "5511999990000" }],
    "messages": [{ "from": "5511999990000", "id": "wamid.ABC", "timestamp": "1760650000", "type": "text", "text": { "body": "oi" } }]
  }}]}]}
```

## Decisões
- **Rota:**
  - `export async function POST(req)`: `const bruto = await req.text()`;
  - `processarWebhookWhatsapp(getDb(), …)` faz assinatura → parse → dedup e devolve as mensagens a encaminhar;
  - `after(() => encaminharParaN8n(...))`;
  - `return Response.json({ ok: true })`;
  - **sem** `export const runtime`, que o Next 16 proíbe com Cache Components. O runtime já é Node, então `node:crypto` funciona.
- **Dedup antes de encaminhar:** `insert … onConflictDoNothing().returning()`. Se nada voltou, a mensagem já tinha sido vista. A escolha deliberada é "no máximo uma vez": se o n8n falhar depois, aquela mensagem fica sem resposta, mas o cliente pode repetir. É melhor do que responder em dobro.
- **Timestamp da Meta:** vem em segundos e em string; é convertido com `Number(ts) * 1000`.
- **`WHATSAPP_*` do Next em env.ts:** o grupo `env.whatsapp()` exige `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET`. Se faltarem, a rota responde 503 com um log claro, sem quebrar o resto do app.
- **Workflows:**
  - **"WhatsApp Entrada":** Webhook (`responseMode: onReceived`, auth `headerAuth` → `credWebhookIntr1`) → IF → Execute Workflow (`workflowId = wfAgenteRestaur1`, modo "wait for completion") → Split Out (`mensagens`) → WhatsApp (`operation: send`, `messageType: text`, `phoneNumberId: ={{$env.WHATSAPP_PHONE_NUMBER_ID}}`, `recipientPhoneNumber: ={{ $('Webhook').item.json.body.telefone }}`). O nó WhatsApp processa os itens em sequência e preserva a ordem.
  - **"Notificar Cliente":** Webhook (`responseMode: responseNode`) → WhatsApp → Respond to Webhook `{ok:true}`; na saída de erro, Respond 502.
- **Teste estrutural dos workflows:** carrega o JSON e confere a credencial do webhook, o `phoneNumberId` via `$env`, o `workflowId` do agente e a ausência de tokens literais.

## Riscos
- O nó WhatsApp do n8n pode exigir que o `phoneNumberId` venha de uma lista (resource locator). Nesse caso, usar o modo "By ID" com expressão.
- No número de teste, o destinatário precisa estar na lista de permitidos e no formato exato (9º dígito). Está documentado no troubleshooting.
