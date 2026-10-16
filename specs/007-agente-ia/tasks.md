# 007 — Tarefas

- [ ] T007.01 DOC: escrever o system prompt em n8n/prompts/atendente.md (persona, escopo, fluxo, Pix, erros, loja fechada, segurança) — IA-RF-04
      Arquivo: n8n/prompts/atendente.md · Depende de: 004 (contrato) · Pronto quando: cobre todos os itens do IA-RF-04
- [ ] T007.02 SETUP: helpers de teste de workflow (carregarWorkflow, acharNo, executarCode) — IA-RF-06
      Arquivo: tests/n8n/helpers.ts · Depende de: 006 · Pronto quando: importável
- [ ] T007.03 TESTE: código do nó "Montar mensagens" (com Pix, sem Pix, BR Code com espaços, vazio, truncamento em 4096) — IA-RF-06, CA-01, CA-02
      Arquivo: tests/n8n/agente-restaurante.test.ts · Depende de: T007.02 · Pronto quando: falha (workflow ainda não existe)
- [ ] T007.04 TESTE: prompt do JSON = atendente.md; telefone das ferramentas criar/consultar vem do gatilho e sem `$fromAI` — IA-RF-04, IA-RF-05, CA-03, CA-04
      Arquivo: tests/n8n/agente-restaurante.test.ts · Depende de: T007.02 · Pronto quando: falha
- [ ] T007.05 IMPL: escrever o sub-workflow como JSON (gatilho, contexto, agente, Gemini, memória Postgres, 3 ferramentas, Code, fallback), importar pela CLI, abrir na UI para validar e normalizar com `pnpm n8n:export` — IA-RF-01…07
      Arquivo: n8n/workflows/agente-restaurante.json · Depende de: T007.01, 006 · Pronto quando: T007.03 e T007.04 passam
- [ ] T007.06 IMPL: workflow Chat Teste (Chat Trigger público com webhookId fixo, chamada ao agente, join) — IA-RF-08
      Arquivo: n8n/workflows/chat-teste.json, n8n/ids.json · Depende de: T007.05 · Pronto quando: o chat abre em /webhook/<id>/chat
- [ ] T007.07 VERIF: `pnpm n8n:import` sobre um banco limpo publica tudo e o Chat Teste responde — IA-RF-08
      Depende de: T007.06 · Pronto quando: CA-05 ok
- [ ] T007.08 IMPL: scripts/smoke-chat.ts + script `pnpm smoke` — IA-RF-09
      Arquivo: scripts/smoke-chat.ts, package.json · Depende de: T007.06 · Pronto quando: roda e informa o resultado
- [ ] T007.09 DOC: docs/setup-gemini.md (criar a chave no AI Studio, escolher o modelo, limites do free tier, aviso de uso dos dados, como trocar para Groq) — IA-RNF-03
      Arquivo: docs/setup-gemini.md · Depende de: — · Pronto quando: um passo a passo reproduzível
- [ ] T007.10 VERIF: cenários manuais CA-05…CA-12 no Chat Teste, com o resultado de cada um registrado em docs/verificacao-e2e.md; ajustar o prompt e reexportar quando necessário; ROADMAP; commit `feat(007)` — IA-RNF-01, IA-RNF-02
      Depende de: todas · Pronto quando: todos os cenários passam (CA-12 com a chave inválida temporariamente)
