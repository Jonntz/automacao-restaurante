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
- **Comprovado em 2026-10-16:** liberar a permissão **e** rodar `docker desktop restart` resolveu. Liberar só a permissão não basta: o processo antigo continua travado.

### `host.docker.internal` não resolve (Linux)
- **Causa:** no Linux, o nome não existe por padrão.
- **Solução:** o `docker-compose.yml` já declara `extra_hosts: host.docker.internal:host-gateway`. Se você mudou isso, restaure. Se o Next.js rodar em outra máquina, ajuste `NEXT_API_URL`.

### Rodei `pnpm db:reset` e o painel ficou estranho
- **Causa:** o `pnpm dev` mantém a conexão com o arquivo antigo do `local.db`.
- **Solução:** pare o `pnpm dev`, rode `pnpm db:reset` e suba o `pnpm dev` de novo.

## n8n

### Chat de teste responde 404 "webhook … is not registered" logo depois de um import
- **Causa:** o `pnpm n8n:import` reinicia o n8n, e os webhooks levam alguns segundos para registrar depois de o `/healthz` responder.
- **Solução:** espere ~5 s e tente de novo. No log aparece `Processed … 4 published workflows` quando tudo está pronto.

### "Workflow is not active and cannot be executed"
- **Causa:** no n8n 2.x, o nó Execute Workflow só chama sub-workflows **publicados**.
- **Solução:** o bootstrap já publica o "Agente Restaurante". Se você criou outro sub-workflow pela UI, clique em **Publish** nele também.

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

### Erro 404 "model … is no longer available to new users"
- **Causa:** o Google descontinua versões fixas de modelo para contas novas (aconteceu com o `gemini-2.5-flash`).
- **Solução:** use os aliases `gemini-flash-lite-latest` / `gemini-flash-latest` em `GEMINI_MODEL` e rode `docker compose up -d`.

### Erro 429 "limit: 20 … PerDayPerProjectPerModel"
- **Causa:** a cota gratuita é **por modelo e por dia**. Os modelos Flash (não Lite) têm só ~20 requisições por dia.
- **Solução:** mantenha o principal num Flash-Lite (padrão) e o reserva noutro modelo, porque cada modelo tem a própria cota. A cota volta no dia seguinte (horário do Pacífico).

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

### Mudei o provedor de pagamento (código ou `.env`) e nada mudou
- **Causa:** o provedor fica guardado em `globalThis`, para o estado do mock sobreviver ao hot reload do `pnpm dev`.
- **Solução:** reinicie o `pnpm dev`. Cobranças pendentes do mock criadas antes do reinício ficam sem estado, mas o botão **Simular pagamento** continua funcionando.

### Posso pagar o código Pix do mock com o app do banco?
- **Não, e nenhum dinheiro sai da conta.** A chave Pix do mock é `mock@pix.invalid`, num domínio reservado que não pode existir, e o banco recusa o código. Use o botão **Simular pagamento** do painel.

### Paguei, mas o pedido não sai de "Aguardando pagamento"
- **Solução:** clique em **Verificar** no card. O sistema consulta o provedor. Sem webhook configurado, esse é o caminho, ou então o cliente perguntar "já paguei?" ao bot.

## Deploy

### Posso usar a Vercel Hobby para um restaurante de verdade?
- **Não.** O plano Hobby é para **uso não comercial**. Em produção, use o plano Pro ou outro host Node.js ([deploy.md](deploy.md)).
