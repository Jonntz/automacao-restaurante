# 008 — WhatsApp (Cloud API oficial da Meta)

## Objetivo
Ligar o agente (007) ao WhatsApp de verdade:
- receber as mensagens da Meta com segurança (gateway no Next.js, ADR-03);
- encaminhar ao n8n;
- responder pela Cloud API;
- entregar as notificações de status geradas pelo Next.js (002).

## Histórias
- **H1.** Como cliente, quero mandar "oi" para o número do restaurante no WhatsApp e ser atendido pelo agente.
- **H2.** Como cliente, quero receber no WhatsApp os avisos de "pago", "em preparo", "saiu para entrega"…
- **H3.** Como restaurante, quero que ninguém consiga forjar mensagens para o meu webhook.
- **H4.** Como dev, quero um guia passo a passo para configurar o app na Meta.

## Requisitos funcionais

### Gateway no Next.js
- **WPP-RF-01** — `GET /api/webhooks/whatsapp`:
  - se `hub.mode === "subscribe"` e `hub.verify_token` é igual a `WHATSAPP_VERIFY_TOKEN` (timing-safe), responde **200** com `hub.challenge` em texto puro;
  - caso contrário, **403**.
- **WPP-RF-02** — `POST /api/webhooks/whatsapp`:
  - lê o **corpo bruto** (`request.text()`) e valida `X-Hub-Signature-256 = "sha256=" + hex(HMAC_SHA256(WHATSAPP_APP_SECRET, corpo))`, com comparação timing-safe;
  - assinatura ausente ou inválida: **401**.
- **WPP-RF-03** — Extrai as mensagens de `entry[].changes[].value.messages[]`, associando o nome em `value.contacts[]` pelo `wa_id`. Ignora `statuses`, outros `field` e `object` diferente de `whatsapp_business_account`.
- **WPP-RF-04** — Normaliza cada mensagem para `{ telefone: from, nome, tipo, texto, messageId: id, timestamp }`:
  - `tipo = "texto"` para `type: "text"`, com `texto = text.body`;
  - `tipo = "outro"` para os demais tipos (áudio, imagem, figurinha…), com `texto = null`.
- **WPP-RF-05** — Ignora mensagens com `timestamp` mais antigo que **10 min**, para não responder a mensagens velhas reentregues depois de uma queda.
- **WPP-RF-06** — Deduplica por `eventos_processados("whatsapp:<messageId>")`, gravando **antes** de encaminhar. Isso garante no máximo uma resposta por mensagem.
- **WPP-RF-07** — Responde **200** `{ ok: true }` assim que valida e deduplica. O encaminhamento roda **depois da resposta** (`after()` do Next.js): `POST {N8N_URL}/webhook/whatsapp-entrada` com header `x-webhook-secret`, uma chamada por mensagem, na ordem. Falhas vão para o log.
- **WPP-RF-08** — Payload JSON malformado, mas com assinatura válida: **200**, com registro no log (a Meta não deve ficar retentando um payload impossível).

### Workflows no n8n
- **WPP-RF-09** — Workflow **"WhatsApp Entrada"** (publicado):
  - Webhook `POST /webhook/whatsapp-entrada` com Header Auth (credencial do webhook interno), respondendo imediatamente;
  - IF `tipo == "texto"`:
    - **sim:** Execute Workflow "Agente Restaurante" com `{telefone, nome, texto}`, depois Split Out de `mensagens` e, para cada uma **em ordem**, envio de texto pelo nó WhatsApp Business Cloud (`phoneNumberId = $env.WHATSAPP_PHONE_NUMBER_ID`, destinatário = telefone);
    - **não:** envia "Por enquanto só consigo ler mensagens de texto 🙂 Pode escrever o que deseja?".
- **WPP-RF-10** — Workflow **"Notificar Cliente"** (publicado):
  - Webhook `POST /webhook/notificar-cliente` com Header Auth, corpo `{ telefone, mensagem }`;
  - envia o texto pelo nó WhatsApp;
  - responde `{ ok: true }`, ou `{ ok: false, erro }` com HTTP 502 se a Meta recusar.
- **WPP-RF-11** — Os envios ao WhatsApp têm 2 tentativas automáticas (retry on fail, 2 s). Se continuar falhando, o erro aparece na execução do n8n e o workflow não quebra a fila.

### Documentação
- **WPP-RF-12** — `docs/setup-meta-whatsapp.md` cobre:
  1. criar o app (tipo Business) no developers.facebook.com;
  2. adicionar o produto WhatsApp;
  3. pegar o número de teste, o `Phone number ID` e o `WhatsApp Business Account ID`;
  4. adicionar até 5 destinatários, verificados por código;
  5. token temporário (24h) **e** token permanente via System User com as permissões `whatsapp_business_messaging` e `whatsapp_business_management`;
  6. pegar o App Secret;
  7. configurar o webhook com a URL `https://<NGROK_DOMAIN>/api/webhooks/whatsapp` e o Verify Token, e assinar o campo `messages`;
  8. testar mandando "oi";
  9. problemas conhecidos: o 9º dígito de números do Brasil (o `wa_id` pode vir sem o 9; cadastrar o destinatário de teste no formato do `wa_id`) e o erro de destinatário fora da lista de teste.

## Requisitos não funcionais
- **WPP-RNF-01** — O webhook responde à Meta em menos de 1 s (o processamento pesado fica depois da resposta).
- **WPP-RNF-02** — Nada de token da Meta no Next.js. Só o `APP_SECRET` (validação) e o `VERIFY_TOKEN` ficam lá (Constituição X).

## Critérios de aceite
- **CA-01 (auto)** — Dado um GET com o token certo, então a resposta é 200 com o challenge. Com o token errado, 403.
- **CA-02 (auto)** — Dado um POST sem assinatura, ou com assinatura de outro segredo, então 401, e nada é encaminhado.
- **CA-03 (auto)** — Dado um POST válido com 1 mensagem de texto, então a resposta é 200 e o n8n recebe **um** POST com `{telefone, nome, tipo:"texto", texto}` e o header secreto.
- **CA-04 (auto)** — Dada a mesma mensagem entregue duas vezes, então apenas um encaminhamento acontece.
- **CA-05 (auto)** — Dado um payload só com `statuses`, então 200 e nenhum encaminhamento.
- **CA-06 (auto)** — Dada uma mensagem de áudio, então ela é encaminhada com `tipo:"outro"`. Uma mensagem de 15 min atrás não é encaminhada.
- **CA-07 (manual)** — Do celular cadastrado: "oi" recebe a resposta do agente. O fluxo completo de pedido recebe o Pix em mensagem separada.
- **CA-08 (manual)** — Simular o pagamento no admin faz chegar "✅ Pagamento confirmado…" no WhatsApp. Avançar os status faz chegar cada aviso.
- **CA-09 (manual)** — Mandar uma foto recebe a resposta "só consigo ler texto".

## Fora de escopo
Templates (mensagens fora da janela de 24h), confirmação de leitura, indicador de digitação, mídia, botões interativos, número de produção.

## Histórico
- 2026-10-16 — versão inicial. ADR-03 substitui o rewrite do plano original por um gateway no Next.js.
