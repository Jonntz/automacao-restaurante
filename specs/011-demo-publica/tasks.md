# 011 — Tarefas

## Chat web
- [x] T011.01 TESTE: proxy do chat (repasse com segredo, validação, respostas amigáveis, loadPreviousSession) — DEM-RF-02, CA-01…CA-04
      Arquivo: tests/chat/proxy.test.ts · Depende de: — · Pronto quando: falha
- [x] T011.02 IMPL: encaminharChat + rota POST /api/chat — DEM-RF-02
      Arquivo: src/lib/chat/proxy.ts, src/app/api/chat/route.ts · Depende de: T011.01 · Pronto quando: T011.01 passa
- [x] T011.03 TESTE: formatarMensagem (negrito/itálico do WhatsApp, quebras duras, asterisco solto, bloco Pix, HTML literal) — DEM-RF-10, CA-09
      Arquivo: tests/chat/formatar.test.ts · Depende de: — · Pronto quando: falha
- [x] T011.12 IMPL: formatarMensagem — DEM-RF-10
      Arquivo: src/lib/chat/formatar.ts · Depende de: T011.03 · Pronto quando: T011.03 passa
- [x] T011.13 IMPL: página /chat (cabeçalho da marca, conversa, sugestões, "digitando", Pix com "Copiar") e botão "Fazer um pedido" na landing — DEM-RF-01, DEM-RF-03
      Arquivo: src/app/chat/*, src/app/page.tsx · Depende de: T011.02, T011.12 · Pronto quando: build passa e a página abre localmente
- [x] T011.04 TESTE+VERIF: e2e do /chat local (manda "oi", espera resposta, troca o tema, sem rolagem horizontal em 390 px) — CA-05
      Arquivo: scripts/e2e-chat.mjs · Depende de: T011.13 · Pronto quando: `pnpm e2e:chat` verde com o n8n local

## Infra da VM
- [x] T011.05 IMPL: Caddy no compose (profile publico) + infra/Caddyfile + N8N_WEBHOOK_URL configurável — DEM-RF-04, DEM-RF-05, DEM-RNF-03
      Arquivo: docker-compose.yml, infra/Caddyfile · Depende de: — · Pronto quando: `docker compose config` válido com e sem o profile; Caddyfile validado (`caddy validate`)
- [ ] T011.06 IMPL: scripts vm-provisionar.sh e vm-deploy.sh — DEM-RF-06, DEM-RNF-02
      Arquivo: scripts/vm-*.sh · Depende de: T011.05 · Pronto quando: `bash -n` ok; rodam na VM (T011.09)
- [x] T011.07 IMPL: demo-vercel-env.sh + SMOKE_CHAT_URL no smoke — DEM-RF-08
      Arquivo: scripts/demo-vercel-env.sh, scripts/smoke-chat.ts · Depende de: — · Pronto quando: `bash -n` ok

## Deploy (depende das contas criadas pela pessoa usuária)
- [ ] T011.08 DEPLOY: Turso (migrate + seed) e Vercel (link, env, deploy --prod, APP_URL) — DEM-RF-07…DEM-RF-09
      Arquivo: — · Depende de: T011.02, T011.13, T011.07 · Pronto quando: login no painel público funciona e mostra o cardápio da pizzaria
- [ ] T011.09 DEPLOY: VM Oracle (provisionar, subir n8n + Caddy) e N8N_URL na Vercel — DEM-RF-04…DEM-RF-06
      Arquivo: — · Depende de: T011.05, T011.06, T011.08 · Pronto quando: CA-06
- [ ] T011.10 VERIF: pedido pelo /chat público aparece no painel público, simulação e status; segurança do painel e da API — CA-07, CA-08
      Arquivo: docs/verificacao-e2e.md · Depende de: T011.09 · Pronto quando: CA-07 e CA-08 anotados com data

## Documentação
- [ ] T011.11 DOCS: deploy.md reescrito para a topologia da demo + roteiro-demo.md para quem apresenta; arquitetura (ADR-10), ROADMAP — DEM-RNF-01
      Arquivo: docs/deploy.md, docs/roteiro-demo.md, specs/arquitetura.md, specs/ROADMAP.md · Depende de: T011.10 · Pronto quando: os links e as credenciais de teste do roteiro foram conferidos
