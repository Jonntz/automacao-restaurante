# 006 — Plano técnico

## Arquivos
```
docker-compose.yml
n8n/
  bootstrap/
    bootstrap.sh              # sh -e: render → import creds → import workflows → publish → cleanup
    render-credentials.js     # Node puro (sem deps), lê process.env e escreve JSON
  workflows/                  # um .json por workflow (IDs fixos) — criados em 007 e 008
  ids.json                    # mapa slug → id fixo de workflows e credenciais (fonte única)
scripts/n8n-export.ts         # docker compose exec n8n n8n export:workflow … + normalização
tests/infra/{render-credentials,n8n-export}.test.ts
```

## IDs fixos (`n8n/ids.json`)
| Tipo | Slug | ID | Tipo n8n |
|---|---|---|---|
| credencial | gemini | `credGeminiDemo01` | `googlePalmApi` (`host`, `apiKey`) |
| credencial | whatsapp | `credWhatsappDem1` | `whatsAppApi` (`accessToken`, `businessAccountId`) |
| credencial | postgres | `credPostgresDem1` | `postgres` (`host`, `port`, `database`, `user`, `password`, `ssl: disable`) |
| credencial | webhook-interno | `credWebhookIntr1` | `httpHeaderAuth` (`name: x-webhook-secret`, `value`) |
| credencial | api-bot | `credApiBotDemo01` | `httpHeaderAuth` (`name: x-api-key`, `value`) |
| workflow | agente-restaurante | `wfAgenteRestaur1` | sub-workflow (sem publish) |
| workflow | whatsapp-entrada | `wfWhatsappEntr01` | publish |
| workflow | chat-teste | `wfChatTesteDemo1` | publish |
| workflow | notificar-cliente | `wfNotificarClie1` | publish |

> Os nomes dos campos de cada tipo de credencial precisam ser confirmados exportando uma credencial criada na UI da versão fixada (tarefa T006.03). Esta tabela será atualizada se algum campo divergir.

## Decisões
- **Por que bootstrap antes do n8n principal:** os comandos de CLI e o processo principal compartilham o banco. Importar e publicar com o n8n parado garante que os webhooks sejam registrados quando ele subir.
- **`render-credentials.js`:** exporta uma função pura `montarCredenciais(env)`, testada no Vitest, e um `main()` que grava o arquivo. Variáveis ausentes recebem o placeholder `"PREENCHA_NO_ENV"` e geram um aviso no log.
- **Versões fixadas:** `n8nio/n8n` na versão 2.x estável mais recente no dia da implementação (2.43.x em 2026-10-16), `postgres:16-alpine` e `ngrok/ngrok` na última 3.x. As versões ficam registradas no README.
- **Export:** `docker compose exec -T n8n n8n export:workflow --all --separate --pretty --output=/tmp/export`, seguido de `docker compose cp` para uma pasta temporária e da normalização em TS:
  - remove as chaves voláteis;
  - ordena as chaves de topo;
  - renomeia cada arquivo para `<slug>.json` usando o `ids.json`;
  - procura segredos comparando com os valores de env presentes.

## Riscos
- O `publish:workflow` pode exigir que o workflow tenha sido salvo por um usuário (owner). Se falhar num banco novo, o fallback é publicar pela UI depois de criar o dono, com o passo documentado no README.
- A credencial `googlePalmApi` pode ter outro nome de tipo na versão fixada. Se tiver, ajustar com base no export.
