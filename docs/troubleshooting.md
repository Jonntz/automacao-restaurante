# Troubleshooting

Cada problema está no formato **sintoma → causa → solução**. Os guias de setup têm tabelas específicas: [Gemini](setup-gemini.md), [WhatsApp](setup-meta-whatsapp.md) e [AbacatePay](setup-abacatepay.md).

## Ambiente local

### `pnpm install` falha com `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`
- **Causa:** o pnpm 11 recusa versões publicadas há menos de 1 dia (proteção contra ataques à cadeia de dependências).
- **Solução:** fixe uma versão um pouco mais antiga no `package.json`, apague o lockfile só se ele for recente (`pnpm clean --lockfile`) e rode `pnpm install` de novo. Foi por isso que o projeto fixou o Next 16.4.1.

### Docker Desktop (macOS) trava ao subir o n8n
- **Sintoma:**
  - `pnpm infra:up` não termina;
  - `docker compose ps` mostra o `n8n-bootstrap` como **Created** e nunca **Running**;
  - depois disso, nenhum container novo inicia e até `docker info` trava.
- **Causa provável:** o bootstrap monta a pasta `./n8n` do projeto. Com o projeto dentro de `~/Documents`, o macOS pede permissão para o Docker acessar Documentos, e o Docker espera um clique na janela de permissão.
- **Solução:**
  1. Procure a janela "Docker gostaria de acessar arquivos na pasta Documentos" e clique em **Permitir**. Se ela não aparecer, vá em **Ajustes do Sistema → Privacidade e Segurança → Arquivos e Pastas → Docker → Pasta Documentos**.
  2. Confira em **Docker Desktop → Settings → Resources → File sharing** se `/Users` está compartilhado.
  3. Reinicie o Docker Desktop pelo menu da barra.
  4. Rode `pnpm infra:up` de novo.
  5. Se persistir, mova o projeto para fora de `~/Documents` (por exemplo, `~/dev/automacao-restaurante`).

### `host.docker.internal` não resolve (Linux)
- **Causa:** no Linux, o nome não existe por padrão.
- **Solução:** o `docker-compose.yml` já declara `extra_hosts: host.docker.internal:host-gateway`. Se você mudou isso, restaure. Se o Next.js rodar em outra máquina, ajuste `NEXT_API_URL`.

### Rodei `pnpm db:reset` e o painel ficou estranho
- **Causa:** o `pnpm dev` mantém a conexão com o arquivo antigo do `local.db`.
- **Solução:** pare o `pnpm dev`, rode `pnpm db:reset` e suba o `pnpm dev` de novo.

## n8n

### Workflows não aparecem ou não estão publicados
- **Solução:**
  1. Veja o log do bootstrap: `pnpm infra:logs`.
  2. Se aparecer "não consegui publicar", abra `http://localhost:5678`, crie o usuário dono (só na primeira vez), abra cada workflow com gatilho (**WhatsApp Entrada**, **Chat Teste**, **Notificar Cliente**) e clique em **Publish**.
  3. Para reimportar do git: `pnpm n8n:import`.

### Editei um workflow na UI e quero salvar no git
- **Solução:** `pnpm n8n:export`. O script remove campos voláteis e **falha** se encontrar algum segredo do `.env` no JSON; nesse caso, use credenciais do n8n em vez de colar o valor.

### Erro no nó "Memória" (Postgres Chat Memory)
- **Causa:** a credencial do Postgres está com dados errados.
- **Solução:** confira `POSTGRES_*` no `.env` e rode `pnpm n8n:import`. A tabela `n8n_chat_historico` é criada sozinha na primeira mensagem.

### A ferramenta `criar_pedido` envia o corpo vazio ou o `itens` como texto
- **Causa:** o `$fromAI` do n8n às vezes serializa JSON de forma inesperada.
- **Solução:**
  - a API já aceita `itens` como string JSON (BOT-RF-07);
  - se o corpo chegar vazio, veja a execução no n8n e o log do Next.js;
  - o plano B é trocar a ferramenta por um **Call n8n Workflow Tool** com entradas tipadas (specs/007-agente-ia/plan.md).

## IA (Gemini)

### O bot responde "tive um probleminha técnico"
- **Causa:** erro no agente. Os motivos mais comuns:
  - **429**, cota do free tier esgotada;
  - chave inválida;
  - `NEXT_API_URL` inalcançável a partir do container.
- **Solução:**
  1. Veja a execução com erro em `http://localhost:5678` → **Executions**.
  2. Se for 429, espere alguns minutos, ou use um modelo Flash-Lite em `GEMINI_MODEL`, ou troque para Groq ([setup-gemini.md](setup-gemini.md#4-trocar-para-groq-llama-se-preferir)).

## WhatsApp e túnel

### Token da Meta expirado (erro 190)
- **Solução:** gere o token permanente via System User ([setup-meta-whatsapp.md](setup-meta-whatsapp.md#2-copiar-os-ids-e-o-token)) e rode `pnpm n8n:import`.

### Erro 131030, destinatário fora da lista (9º dígito)
- **Causa:** o número cadastrado na lista de teste não está no mesmo formato do `wa_id`. Celulares brasileiros podem chegar sem o 9º dígito.
- **Solução:** cadastre o número exatamente como aparece no campo `telefone` da execução.

### A Meta não verifica o webhook, ou o Next.js responde 401
- **Causa:** túnel fora do ar, `WHATSAPP_VERIFY_TOKEN` diferente ou `WHATSAPP_APP_SECRET` errado.
- **Solução:** suba o túnel (`pnpm tunel:up`) e confira as duas variáveis.

### ngrok não sobe
- **Causa:** `NGROK_AUTHTOKEN` vazio ou `NGROK_DOMAIN` que não é seu.
- **Solução:**
  - veja `docker compose --profile tunel logs ngrok`;
  - o inspetor do túnel fica em `http://127.0.0.1:4040`;
  - no plano gratuito há 1 endpoint ativo e um limite mensal de requisições, suficiente para a PoC.

## Pagamento

### Paguei, mas o pedido não sai de "Aguardando pagamento"
- **Solução:** clique em **Verificar** no card. O sistema consulta o provedor. Sem webhook configurado, esse é o caminho, ou então o cliente perguntar "já paguei?" ao bot.

## Deploy

### Posso usar a Vercel Hobby para um restaurante de verdade?
- **Não.** O plano Hobby é para **uso não comercial**. Em produção, use o plano Pro ou outro host Node.js ([deploy.md](deploy.md)).
