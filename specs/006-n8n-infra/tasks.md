# 006 — Tarefas

- [ ] T006.01 SETUP: docker-compose.yml com postgres + n8n (porta só em localhost, env, volumes, healthcheck, extra_hosts) — INF-RF-01…03
      Arquivo: docker-compose.yml · Depende de: 001 (.env.example) · Pronto quando: `docker compose config` válido e o n8n sobe saudável
- [ ] T006.02 SETUP: n8n/ids.json (IDs fixos de credenciais e workflows) — INF-RF-04
      Arquivo: n8n/ids.json · Depende de: — · Pronto quando: os 9 IDs estão definidos
- [ ] T006.03 VERIF: na UI do n8n fixado, criar uma credencial de cada tipo e exportar (`export:credentials --decrypted`) para confirmar o tipo e os campos; atualizar a tabela do plan.md se divergir — INF-RF-04
      Arquivo: specs/006-n8n-infra/plan.md · Depende de: T006.01 · Pronto quando: os campos estão confirmados
- [ ] T006.04 TESTE: montarCredenciais(env) gera as 5 credenciais com IDs fixos, tipos e campos corretos, e usa placeholder + aviso quando falta variável — INF-RF-04
      Arquivo: tests/infra/render-credentials.test.ts · Depende de: T006.03 · Pronto quando: falha
- [ ] T006.05 IMPL: n8n/bootstrap/render-credentials.js — INF-RF-04
      Arquivo: n8n/bootstrap/render-credentials.js · Depende de: T006.04 · Pronto quando: T006.04 passa
- [ ] T006.06 IMPL: bootstrap.sh + serviço n8n-bootstrap (depends_on, montagem de workflows e bootstrap, limpeza do arquivo temporário) — INF-RF-04
      Arquivo: n8n/bootstrap/bootstrap.sh, docker-compose.yml · Depende de: T006.05 · Pronto quando: CA-01 e CA-03 com um workflow placeholder
- [ ] T006.07 [P] IMPL: serviço ngrok (profile tunel) — INF-RF-05
      Arquivo: docker-compose.yml · Depende de: T006.01 · Pronto quando: CA-05
- [ ] T006.08 TESTE: normalização do export (remove voláteis, renomeia por slug, detecta segredo) — INF-RF-07
      Arquivo: tests/infra/n8n-export.test.ts · Depende de: T006.02 · Pronto quando: falha
- [ ] T006.09 IMPL: scripts/n8n-export.ts (normalizarWorkflow puro + main com docker compose exec/cp) — INF-RF-07, INF-RF-08
      Arquivo: scripts/n8n-export.ts · Depende de: T006.08 · Pronto quando: T006.08 passa e CA-04 verificado
- [ ] T006.10 SETUP: scripts pnpm infra:up/down/logs/reset, tunel:up, n8n:import, n8n:export — INF-RF-06
      Arquivo: package.json · Depende de: T006.06, T006.09 · Pronto quando: todos rodam
- [ ] T006.11 VERIF: CA-01…CA-06 (incluindo a porta recusada pela rede local) e o tempo de subida < 60 s; ROADMAP; commit `feat(006)` — INF-RNF-01, INF-RNF-02
      Depende de: todas · Pronto quando: tudo ok
