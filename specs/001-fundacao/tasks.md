# 001 — Tarefas

- [ ] T001.01 SETUP: gerar app Next.js 16 (TS, App Router, `src/`, Tailwind, ESLint, pnpm, alias `@/*`) na raiz — FUN-RF-01
      Arquivo: raiz do repo · Depende de: — · Pronto quando: `pnpm dev` sobe e `GET /` responde 200
- [ ] T001.02 SETUP: instalar dependências (drizzle-orm, drizzle-kit, @libsql/client, zod, jose, vitest, tsx) e criar scripts `typecheck`, `test`, `test:watch` — FUN-RF-09
      Arquivo: package.json · Depende de: T001.01 · Pronto quando: `pnpm typecheck` roda
- [ ] T001.03 [P] SETUP: inicializar shadcn/ui e adicionar componentes base (button, card, input, label, badge, sheet, dialog, switch, sonner, select, textarea, separator) — FUN-RF-01
      Arquivo: components.json, src/components/ui/* · Depende de: T001.01 · Pronto quando: build passa
- [ ] T001.04 SETUP: configurar Vitest (node, alias `@/`, `tests/**/*.test.ts`) — FUN-RF-02
      Arquivo: vitest.config.ts · Depende de: T001.02 · Pronto quando: `pnpm test` roda (0 testes ok)
- [ ] T001.05 [P] TESTE: formatarCentavos e parseReais (CA-04, CA-05 e casos de borda) — FUN-RF-08
      Arquivo: tests/fundacao/dinheiro.test.ts · Depende de: T001.04 · Pronto quando: falha por falta da implementação
- [ ] T001.06 IMPL: src/lib/dinheiro.ts — FUN-RF-08
      Arquivo: src/lib/dinheiro.ts · Depende de: T001.05 · Pronto quando: T001.05 passa
- [ ] T001.07 [P] TESTE: numeroPedido (1 → #0001, 12345 → #12345) — FUN-RF-10
      Arquivo: tests/fundacao/pedido-numero.test.ts · Depende de: T001.04 · Pronto quando: falha
- [ ] T001.08 IMPL: src/lib/pedido-numero.ts — FUN-RF-10
      Arquivo: src/lib/pedido-numero.ts · Depende de: T001.07 · Pronto quando: T001.07 passa
- [ ] T001.09 [P] TESTE: env.banco() falha com mensagem citando DATABASE_URL quando ausente — FUN-RF-06, CA-06
      Arquivo: tests/fundacao/env.test.ts · Depende de: T001.04 · Pronto quando: falha
- [ ] T001.10 IMPL: src/lib/env.ts com leitores por grupo (banco, admin, bot, n8n, pagamento, whatsapp) — FUN-RF-06
      Arquivo: src/lib/env.ts · Depende de: T001.09 · Pronto quando: T001.09 passa
- [ ] T001.11 IMPL: schema Drizzle completo conforme data-model.md (tabelas, enums, checks, índices, FKs) — FUN-RF-04
      Arquivo: src/lib/db/schema.ts · Depende de: T001.02 · Pronto quando: `pnpm typecheck` passa
- [ ] T001.12 SETUP: drizzle.config.ts (`dialect: turso`) + `pnpm db:generate` gerando a primeira migration — FUN-RF-04
      Arquivo: drizzle.config.ts, drizzle/* · Depende de: T001.11 · Pronto quando: SQL gerado contém as 8 tabelas
- [ ] T001.13 IMPL: client.ts (`criarDb`, `getDb`, `PRAGMA foreign_keys=ON`) + migrar.ts — FUN-RF-03
      Arquivo: src/lib/db/client.ts, src/lib/db/migrar.ts · Depende de: T001.10, T001.12 · Pronto quando: typecheck passa
- [ ] T001.14 TESTE: helper criarDbTeste + teste de isolamento entre dois bancos — FUN-RF-02, CA-03
      Arquivo: tests/helpers/db.ts, tests/fundacao/db.test.ts · Depende de: T001.13 · Pronto quando: passa
- [ ] T001.15 TESTE: seedDemo cria 1 config, 4 categorias, 13 itens e é idempotente (rodar 2×) — FUN-RF-05, CA-02
      Arquivo: tests/fundacao/seed.test.ts · Depende de: T001.14 · Pronto quando: falha
- [ ] T001.16 IMPL: seed.ts (seedDemo + main) — FUN-RF-05
      Arquivo: src/lib/db/seed.ts · Depende de: T001.15 · Pronto quando: T001.15 passa
- [ ] T001.17 SETUP: scripts `db:migrate`, `db:seed`, `db:reset` (tsx) — FUN-RF-09
      Arquivo: package.json, scripts/db-*.ts · Depende de: T001.16 · Pronto quando: os três rodam em `file:./local.db`
- [ ] T001.18 [P] DOC: `.env.example` completo e comentado; `.gitignore` com `.env`, `local.db*` — FUN-RF-07, FUN-RNF-03
      Arquivo: .env.example, .gitignore · Depende de: — · Pronto quando: toda variável da arquitetura está presente
- [ ] T001.19 IMPL: landing `src/app/page.tsx` simples (nome do projeto + link para /admin) — FUN-RF-01
      Arquivo: src/app/page.tsx · Depende de: T001.03 · Pronto quando: renderiza
- [ ] T001.20 VERIF: CA-01…CA-06; `pnpm typecheck && pnpm lint && pnpm test`; tempo da suíte < 10 s — FUN-RNF-01, FUN-RNF-02
      Depende de: todas · Pronto quando: tudo verde, ROADMAP atualizado, commit `feat(001)`
