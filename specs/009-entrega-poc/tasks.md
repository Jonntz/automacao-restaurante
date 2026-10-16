# 009 — Tarefas

- [x] T009.01 DOC: CLAUDE.md (fluxo SDD, comandos, fronteiras) — ENT-RF-06
      Arquivo: CLAUDE.md · Depende de: — · Pronto quando: existe (é criado já na Etapa 1)
- [x] T009.02 DOC: docs/setup-abacatepay.md — ENT-RF-02
      Arquivo: docs/setup-abacatepay.md · Depende de: 003 · Pronto quando: passo a passo completo
- [x] T009.03 DOC: docs/troubleshooting.md (todos os itens do ENT-RF-04) — ENT-RF-04
      Arquivo: docs/troubleshooting.md · Depende de: 006–008 · Pronto quando: cada item tem sintoma, causa e solução
- [x] T009.04 DOC: docs/deploy.md (Vercel + Turso + Oracle VM + Caddy + checklist de env) — ENT-RF-03
      Arquivo: docs/deploy.md · Depende de: 006 · Pronto quando: guia completo com links oficiais
- [x] T009.05 DOC: docs/verificacao-e2e.md consolidado (CAs manuais de 005, 007 e 008) — ENT-RF-05
      Arquivo: docs/verificacao-e2e.md · Depende de: 005, 007, 008 · Pronto quando: a tabela está completa
- [x] T009.11 IMPL: scripts/env-init.ts + `pnpm env:init` (segredos aleatórios, sem sobrescrever) — ENT-RF-07
      Arquivo: scripts/env-init.ts, package.json · Depende de: — · Pronto quando: gera um .env válido e se recusa a sobrescrever
- [x] T009.06 DOC: README.md (caminho rápido, caminho completo, scripts, estrutura, versões) — ENT-RF-01
      Arquivo: README.md · Depende de: T009.02–T009.05 · Pronto quando: um leitor novo consegue seguir
- [x] T009.07 VERIF: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — ENT-RNF-01, CA-03
      Depende de: todas as features · Pronto quando: verde
- [x] T009.08 VERIF: varredura de segredos (`git grep` pelos prefixos) — ENT-RNF-02, CA-04
      Depende de: — · Pronto quando: limpo
- [ ] T009.09 VERIF: executar o Caminho rápido do zero (banco e volumes limpos) e registrar em verificacao-e2e.md — CA-01, CA-02
      Depende de: T009.06 · Pronto quando: pedido pago visto no admin
- [ ] T009.10 VERIF: revisão final de rastreabilidade (todo RF tem tarefa e CA; todas as tasks marcadas; ROADMAP 100%); commit `docs(009)` + tag `poc-v0.1`
      Depende de: todas · Pronto quando: ROADMAP todo ✅ (ou ⛔ justificado por credencial externa)
