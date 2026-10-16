# 006 — Infraestrutura do n8n (Docker + bootstrap + túnel)

## Objetivo
Subir n8n + Postgres com um comando, já com credenciais e workflows importados e publicados a partir do repositório, e opcionalmente o túnel público. Os workflows ficam versionados no git, e o caminho de volta (exportar o que foi editado na UI) também é um comando.

## Histórias
- **H1.** Como dev, quero `pnpm infra:up` e ter o n8n em `http://localhost:5678` com os workflows do projeto prontos.
- **H2.** Como dev, quero editar um workflow na UI e trazê-lo de volta para o git com `pnpm n8n:export`.
- **H3.** Como dev, quero `pnpm tunel:up` para expor o Next.js num domínio HTTPS fixo, para a Meta e o AbacatePay.

## Requisitos funcionais
- **INF-RF-01** — `docker-compose.yml` na raiz com estes serviços:
  - `postgres` (`postgres:16-alpine`), com healthcheck e volume nomeado;
  - `n8n` (`docker.n8n.io/n8nio/n8n:<versão fixada 2.x>`), com volume nomeado, porta **`127.0.0.1:5678:5678`** (nunca exposta na rede) e `extra_hosts: ["host.docker.internal:host-gateway"]`.
- **INF-RF-02** — Ambiente do n8n:
  - banco: `DB_TYPE=postgresdb` + `DB_POSTGRESDB_*`;
  - credenciais: `N8N_ENCRYPTION_KEY`;
  - fuso: `GENERIC_TIMEZONE=America/Sao_Paulo`, `TZ`;
  - variáveis acessíveis aos nós: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`;
  - `NEXT_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, `GEMINI_MODEL`;
  - `N8N_SECURE_COOKIE=false` (UI em http local);
  - `N8N_DIAGNOSTICS_ENABLED=false`, `N8N_PERSONALIZATION_ENABLED=false`;
  - `WEBHOOK_URL=http://localhost:5678/`.
- **INF-RF-03** — O Postgres serve ao n8n como banco interno **e** à memória de chat (tabela criada pelo nó Postgres Chat Memory).
- **INF-RF-04** — Serviço one-shot `n8n-bootstrap`, com a mesma imagem e o mesmo ambiente do n8n, que roda **antes** do n8n (`depends_on: condition: service_completed_successfully`):
  1. `node /bootstrap/render-credentials.js` gera `/tmp/credenciais.json` a partir das env vars, com IDs fixos (tabela no plan).
  2. `n8n import:credentials --input=/tmp/credenciais.json`.
  3. `n8n import:workflow --separate --input=/workflows`.
  4. `n8n publish:workflow --id=<id>` para cada workflow com trigger (o n8n 2.x substituiu "ativar" por "publicar").
  - É idempotente: rodar de novo sobrescreve pelo mesmo ID.
  - O arquivo temporário de credenciais é apagado ao fim.
  - Se faltar uma variável opcional (ex.: `WHATSAPP_ACCESS_TOKEN`), a credencial é criada com um valor placeholder e um aviso no log, sem falhar.
- **INF-RF-05** — Serviço `ngrok` no profile `tunel` (`ngrok/ngrok:<versão fixada>`), com `NGROK_AUTHTOKEN` e o comando `http --url=${NGROK_DOMAIN} host.docker.internal:3000`. O inspetor fica em `127.0.0.1:4040`.
- **INF-RF-06** — Scripts pnpm:

  | Script | O que faz |
  |---|---|
  | `infra:up` | `docker compose up -d` |
  | `infra:down` | `docker compose down` |
  | `infra:logs` | logs do n8n e do bootstrap |
  | `infra:reset` | `down -v` + `up`, com aviso de que apaga os dados do n8n |
  | `tunel:up` | `docker compose --profile tunel up -d ngrok` |
  | `n8n:import` | reexecuta o bootstrap |
  | `n8n:export` | `n8n export:workflow --separate --pretty` para `n8n/workflows/` |

- **INF-RF-07** — O `n8n:export` normaliza os arquivos para diff limpo:
  - remove campos voláteis (`updatedAt`, `versionId`, `meta.instanceId`, `pinData`);
  - garante que nenhum segredo literal foi salvo (falha se encontrar valores de env conhecidos);
  - nomeia cada arquivo pelo slug do workflow.
- **INF-RF-08** — Os workflows nunca contêm segredos: referenciam credenciais por ID e usam `$env` só para valores não secretos (`NEXT_API_URL`, `WHATSAPP_PHONE_NUMBER_ID`, `GEMINI_MODEL`).

## Requisitos não funcionais
- **INF-RNF-01** — Do zero (com imagens já baixadas) até o n8n saudável em menos de 60 s.
- **INF-RNF-02** — Funciona em macOS (Docker Desktop) e Linux (`host-gateway`).

## Critérios de aceite
- **CA-01** — Dado o `.env` preenchido, quando rodo `pnpm infra:up`, então `curl http://localhost:5678/healthz` responde 200 e o `n8n-bootstrap` termina com código 0.
- **CA-02** — Dado o primeiro acesso à UI, quando crio o usuário dono, então vejo os 4 workflows publicados e as 5 credenciais (Gemini, WhatsApp, Postgres, Webhook interno, API do Bot).
- **CA-03** — Dado que rodo `pnpm n8n:import` duas vezes seguidas, então não há workflows nem credenciais duplicados.
- **CA-04** — Dado que alterei um workflow na UI, quando rodo `pnpm n8n:export`, então `git diff` mostra só a mudança, sem campos voláteis, e nenhum segredo.
- **CA-05** — Dado `NGROK_DOMAIN` configurado, quando rodo `pnpm tunel:up` com o Next.js no ar, então `https://<NGROK_DOMAIN>/` responde a landing do app.
- **CA-06** — Dado outro computador na mesma rede, quando acesso `http://<ip-da-máquina>:5678`, então a conexão é recusada.

## Fora de escopo
Fila do n8n (queue mode), runners externos, backup, HTTPS próprio para o n8n (o deploy está em 009).

## Histórico
- 2026-10-16 — versão inicial (n8n 2.x: `publish:workflow` substitui `update:workflow --active`).
- 2026-10-16 — Versões fixadas: n8n 2.43.4 (a `stable`, 2.43.7, saiu no mesmo dia; segui a mesma cautela de idade mínima do pnpm), `postgres:16-alpine` e `ngrok:3.39.11-alpine`. O bootstrap monta `./n8n` inteiro em `/projeto-n8n`.
- 2026-10-16 — **Bloqueio de ambiente:** no macOS, o Docker Desktop travou ao iniciar o primeiro container com bind mount de `~/Documents`. Depois disso nenhum container novo iniciava, e nem o próprio Docker fechava. A hipótese é um pedido de permissão do macOS ("Docker quer acessar Documentos") esperando clique na tela. A verificação (T006.03, T006.06, T006.07, T006.10, T006.11) fica pendente até destravar.
