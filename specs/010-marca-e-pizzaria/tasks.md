# 010 — Tarefas

## Cardápio de pizzaria
- [x] T010.01 TESTE: seed demo da pizzaria (5 categorias, 20 itens, tamanhos no nome da categoria, idempotente, config "Container Lanches") — MRC-RF-07, CA-04
      Arquivo: tests/fundacao/seed.test.ts · Depende de: — · Pronto quando: falha
- [x] T010.02 IMPL: seed.ts com aplicarSeed(db, dados) + CARDAPIO_DEMO; cardápio de teste fixo em tests/helpers/cardapio-teste.ts; criarDbComSeed usa o de teste — MRC-RF-07, MRC-RF-08, CA-07
      Arquivo: src/lib/db/seed.ts, tests/helpers/{cardapio-teste,fixtures}.ts · Depende de: T010.01 · Pronto quando: a suíte inteira passa
- [x] T010.03 IMPL: mock do Pix com recebedor CONTAINER LANCHES (+ teste) — MRC-RF-10
      Arquivo: src/lib/pagamentos/mock.ts, tests/pagamentos/mock.test.ts · Depende de: — · Pronto quando: testes passam

## Identidade visual
- [x] T010.04 TESTE: contraste WCAG ≥ 4,5:1 dos pares de tokens nos dois temas, lido de globals.css — MRC-RF-05, CA-02
      Arquivo: tests/marca/contraste.test.ts · Depende de: — · Pronto quando: falha com os tokens atuais (cinza neutro do template)
- [x] T010.05 IMPL: tokens hex claro/escuro da marca em globals.css + --font-heading/--font-script — MRC-RF-01, MRC-RF-05
      Arquivo: src/app/globals.css · Depende de: T010.04 · Pronto quando: T010.04 passa
- [x] T010.06 IMPL: assets (logo.jpg, logo-quadrada.png, icon.png) com recorte da imagem enviada — MRC-RF-03
      Arquivo: public/marca/*, src/app/icon.png · Depende de: — · Pronto quando: arquivos gerados e conferidos visualmente
- [x] T010.07 IMPL: fontes (Anton, Barlow, Yellowtail) + ThemeProvider (padrão escuro) no layout raiz — MRC-RF-02, MRC-RF-04
      Arquivo: src/app/layout.tsx, src/components/provedor-tema.tsx · Depende de: T010.05 · Pronto quando: build passa sem erro de prerender
- [x] T010.08 IMPL: <Marca/> e <AlternarTema/>; aplicar no cabeçalho do admin, no login e na landing; títulos com Anton (kanban, cardápio) — MRC-RF-02…04, MRC-RF-10
      Arquivo: src/components/{marca,alternar-tema}.tsx, src/app/{page,login/page,admin/layout}.tsx, admin/pedidos/kanban.tsx, admin/cardapio/page.tsx · Depende de: T010.06, T010.07 · Pronto quando: CA-01 e CA-03 verificados no navegador

## Atendente e Chat Teste
- [x] T010.09 TESTE: prompt com regras de pizzaria (meio a meio, borda, tamanhos) e Chat Teste com customCss da marca, título e logo via APP_URL — MRC-RF-06, MRC-RF-09
      Arquivo: tests/n8n/agente-restaurante.test.ts · Depende de: — · Pronto quando: falha
- [x] T010.10 IMPL: atendente.md + agente-restaurante.json (prompt) + chat-teste.json (customCss, título, mensagem inicial) + APP_URL no compose — MRC-RF-06, MRC-RF-09
      Arquivo: n8n/prompts/atendente.md, n8n/workflows/*.json, docker-compose.yml · Depende de: T010.09 · Pronto quando: T010.09 passa

## Roteiros, docs e verificação
- [x] T010.11 IMPL: e2e:admin com pizzas + verificação do switch de tema (troca e persistência); smoke com pedido de pizza — MRC-RF-04, MRC-RF-10, MRC-RNF-01
      Arquivo: scripts/e2e-admin.mjs, scripts/smoke-chat.ts · Depende de: T010.08 · Pronto quando: roda verde
- [x] T010.12 DOC: README, docs e specs com a nova marca e o cardápio (001 data-model aponta para o seed novo; 007 CA-06 com valores de pizza) — MRC-RF-10
      Arquivo: README.md, docs/*.md, specs/001-fundacao/data-model.md, specs/007-agente-ia/spec.md · Depende de: — · Pronto quando: sem "Burger Demo" fora do cardápio de teste e do histórico
- [x] T010.13 VERIF: db:reset + n8n:import; CA-01…CA-07 (e2e nos dois temas, Chat Teste com meio a meio e borda, screenshots claro/escuro); typecheck/lint/test/build; ROADMAP; commit `feat(010)` — MRC-RNF-01, MRC-RNF-02, CA-05, CA-06
      Depende de: todas · Pronto quando: tudo verde e registrado em docs/verificacao-e2e.md
