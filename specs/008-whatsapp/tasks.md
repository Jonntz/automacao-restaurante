# 008 — Tarefas

## Gateway (Next.js)
- [x] T008.01 SETUP: fixtures de payload da Meta (texto, áudio, statuses, 2 mensagens, malformado) — WPP-RF-03, WPP-RF-04
      Arquivo: tests/fixtures/meta/*.json · Depende de: — · Pronto quando: os arquivos existem
- [x] T008.02 [P] TESTE: validarAssinaturaMeta (válida, outro segredo, header ausente, sem prefixo `sha256=`, tamanho diferente) — WPP-RF-02, CA-02
      Arquivo: tests/whatsapp/assinatura.test.ts · Depende de: 003 (seguranca.ts) · Pronto quando: falha
- [x] T008.03 IMPL: src/lib/whatsapp/assinatura.ts — WPP-RF-02
      Arquivo: src/lib/whatsapp/assinatura.ts · Depende de: T008.02 · Pronto quando: T008.02 passa
- [x] T008.04 [P] TESTE: extrairMensagens (texto + nome via contacts, áudio → outro, statuses ignorados, mensagem > 10 min ignorada, múltiplas em ordem, object errado) — WPP-RF-03…05, CA-05, CA-06
      Arquivo: tests/whatsapp/parse.test.ts · Depende de: T008.01 · Pronto quando: falha
- [x] T008.05 IMPL: src/lib/whatsapp/parse.ts — WPP-RF-03…05
      Arquivo: src/lib/whatsapp/parse.ts · Depende de: T008.04 · Pronto quando: T008.04 passa
- [x] T008.06 TESTE: processarWebhookWhatsapp (401, dedup na 2ª entrega, malformado com assinatura válida → 200 sem encaminhar) + encaminharParaN8n (URL, header, corpo, uma chamada por mensagem, engole erro) — WPP-RF-06…08, CA-03, CA-04
      Arquivo: tests/whatsapp/gateway.test.ts · Depende de: T008.03, T008.05 · Pronto quando: falha
- [x] T008.07 IMPL: src/lib/whatsapp/gateway.ts + encaminhar.ts + env.whatsapp() — WPP-RF-06…08
      Arquivo: src/lib/whatsapp/{gateway,encaminhar}.ts · Depende de: T008.06 · Pronto quando: T008.06 passa
- [x] T008.08 IMPL: rota GET/POST /api/webhooks/whatsapp (verify, after(), 503 sem env) — WPP-RF-01, WPP-RF-07, WPP-RNF-01
      Arquivo: src/app/api/webhooks/whatsapp/route.ts · Depende de: T008.07 · Pronto quando: typecheck passa
- [x] T008.09 TESTE: rota (GET 200/403; POST assinado → 200; POST sem assinatura → 401) — CA-01…CA-03
      Arquivo: tests/whatsapp/rota.test.ts · Depende de: T008.08 · Pronto quando: passa

## Workflows (n8n)
- [x] T008.10 TESTE: estrutura dos workflows WhatsApp Entrada e Notificar Cliente (header auth com credWebhookIntr1, IF por tipo, Execute Workflow → wfAgenteRestaur1, phoneNumberId via $env, sem tokens literais, retry ligado) — WPP-RF-09…11
      Arquivo: tests/n8n/whatsapp.test.ts · Depende de: 007 (helpers) · Pronto quando: falha
- [x] T008.11 IMPL: workflow whatsapp-entrada.json — WPP-RF-09, WPP-RF-11
      Arquivo: n8n/workflows/whatsapp-entrada.json · Depende de: T008.10, 007 · Pronto quando: T008.10 (parte Entrada) passa e o import publica
- [x] T008.12 IMPL: workflow notificar-cliente.json — WPP-RF-10, WPP-RF-11
      Arquivo: n8n/workflows/notificar-cliente.json · Depende de: T008.10 · Pronto quando: T008.10 passa e o import publica
- [ ] T008.13 VERIF: sem a Meta, simular a ponta interna com `curl` assinado com o `APP_SECRET` do `.env` contra /api/webhooks/whatsapp e ver a execução no n8n até o nó WhatsApp (que falha sem token real, como esperado) — WPP-RF-07, WPP-RF-09
      Depende de: T008.09, T008.11 · Pronto quando: a execução aparece no n8n com os dados certos

## Documentação e E2E
- [x] T008.14 DOC: docs/setup-meta-whatsapp.md (passos 1–9 do WPP-RF-12, com capturas descritas em texto) — WPP-RF-12
      Arquivo: docs/setup-meta-whatsapp.md · Depende de: — · Pronto quando: o passo a passo está completo
- [ ] T008.15 VERIF: roteiro manual CA-07…CA-09 com número de teste real + túnel; registrar em docs/verificacao-e2e.md; ROADMAP; commit `feat(008)` — WPP-RNF-01, WPP-RNF-02
      Depende de: todas, 006 (túnel) · Pronto quando: os cenários foram executados (ou marcados "pendente de credenciais Meta" se o usuário ainda não as forneceu)
