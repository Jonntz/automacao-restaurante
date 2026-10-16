# 004 — Tarefas

- [x] T004.01 [P] TESTE: exigirApiKey (ausente, errada, certa) — BOT-RF-01
      Arquivo: tests/bot/autenticacao.test.ts · Depende de: 003 (seguranca.ts) · Pronto quando: falha
- [x] T004.02 IMPL: src/lib/bot/autenticacao.ts + env.bot() — BOT-RF-01
      Arquivo: src/lib/bot/autenticacao.ts · Depende de: T004.01 · Pronto quando: T004.01 passa
- [x] T004.03 [P] TESTE: entrada tolerante (itens como string JSON, aliases, coerção numérica, campos extras ignorados, JSON quebrado → FORMATO_INVALIDO com exemplo) — BOT-RF-07, BOT-RF-08, CA-03, CA-09
      Arquivo: tests/bot/entrada.test.ts · Depende de: — · Pronto quando: falha
- [x] T004.04 IMPL: src/lib/bot/entrada.ts — BOT-RF-07, BOT-RF-08
      Arquivo: src/lib/bot/entrada.ts · Depende de: T004.03 · Pronto quando: T004.03 passa
- [x] T004.05 [P] TESTE: apresentação (contexto, cálculo com resumoTexto, pedido, lista com pix só em aguardando; todos os valores com formatado + centavos) — BOT-RF-02…06, BOT-RNF-01
      Arquivo: tests/bot/apresentacao.test.ts · Depende de: 002 · Pronto quando: falha
- [x] T004.06 IMPL: src/lib/bot/apresentacao.ts + respostas.ts — BOT-RF-02…06, BOT-RF-09
      Arquivo: src/lib/bot/apresentacao.ts, src/lib/bot/respostas.ts · Depende de: T004.05 · Pronto quando: T004.05 passa
- [x] T004.07 TESTE: servico.contexto (cliente null/existente, cardápio sem indisponíveis, 3 pedidos recentes, < 4 KB) — BOT-RF-02, BOT-RNF-02, CA-02
      Arquivo: tests/bot/servico.test.ts · Depende de: T004.06 · Pronto quando: falha
- [x] T004.08 TESTE: servico.revisar e servico.criar (201, dedup 200 com mesmo pix, 422, 409, 502 e recuperação) — BOT-RF-03…05, CA-04…CA-06, CA-08
      Arquivo: tests/bot/servico.test.ts · Depende de: T004.06 · Pronto quando: falha
- [x] T004.09 TESTE: servico.listar reconcilia pendentes antes de listar; falha na reconciliação não derruba — BOT-RF-06, CA-07
      Arquivo: tests/bot/servico.test.ts · Depende de: T004.06 · Pronto quando: falha
- [x] T004.10 IMPL: src/lib/bot/servico.ts + deps.ts — BOT-RF-02…06, BOT-RF-10
      Arquivo: src/lib/bot/servico.ts, src/lib/bot/deps.ts · Depende de: T004.07–T004.09 · Pronto quando: T004.07–T004.09 passam
- [x] T004.11 IMPL: rotas contexto, pedidos (GET/POST) e pedidos/revisar (cascas finas, 500 sem stack) — BOT-RF-01…09
      Arquivo: src/app/api/bot/**/route.ts · Depende de: T004.10 · Pronto quando: typecheck passa
- [x] T004.12 TESTE: rotas de ponta a ponta (401 em todas, 400 sem telefone, POST feliz 201, JSON quebrado 400) — CA-01, CA-09
      Arquivo: tests/bot/rotas.test.ts · Depende de: T004.11 · Pronto quando: passa
- [x] T004.13 VERIF: CA-01…CA-09; `curl` manual nas 4 rotas com `pnpm dev` + seed, conferindo os exemplos de contracts/api-bot.md; ROADMAP; commit `feat(004)`
      Depende de: todas · Pronto quando: respostas batem com o contrato
