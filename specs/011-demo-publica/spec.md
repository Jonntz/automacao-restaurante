# 011 — Demonstração pública (Vercel + Turso + VM Oracle)

## Objetivo
Pôr a PoC num endereço público, sempre no ar e sem custo, para que outra pessoa apresente ao cliente sem depender da máquina do dono do projeto. O **chat de pedidos** e o **painel** ficam no mesmo link.

## Decisões do usuário (2026-10-22)
- O Next.js (painel, API e página do chat) vai para a **Vercel**.
- O n8n (agente) roda numa **VM Oracle Always Free**. A arquitetura não muda: o n8n continua dono da conversa (Constituição X).
- O chat precisa de uma URL pública. Quem apresenta é um colega, sem acesso ao Mac do usuário.

Padrões assumidos, que o usuário pode trocar:
- banco no **Turso** (free);
- Pix no provedor **`mock`**: o botão "Simular pagamento" fecha o fluxo;
- **sem WhatsApp real** na demo (a T008.15 continua bloqueada pelas credenciais da Meta).

## Histórias
- **H1.** Como apresentador, quero abrir um link e fazer um pedido conversando com o atendente, sem instalar nada.
- **H2.** Como apresentador, quero ver o pedido chegar no painel, simular o Pix e avançar o status.
- **H3.** Como dono, quero que o editor do n8n e os webhooks internos não fiquem abertos na internet.
- **H4.** Como dono, quero que a demo tenha segredos e banco próprios, separados do ambiente local.

## Requisitos funcionais

### Chat web
- **DEM-RF-01** — Página pública **`/chat`** no Next.js, fora do matcher do `proxy.ts`, com um chat próprio em React (shadcn + tokens do tema) que ocupa a tela inteira:
  - **Cabeçalho:** logo, nome, switch de tema e link para o painel.
  - **Mensagens:** as do bot ficam à esquerda e as do cliente à direita. A primeira mensagem dá as boas-vindas como o Chat Teste, sem o aviso "(modo teste)".
  - **Enquanto espera:** aparece o indicador "digitando", e o envio fica bloqueado.
  - **Atalhos:** sugestões clicáveis ("Ver o cardápio" e outras) aparecem até a primeira mensagem do cliente.
  - **Teclado:** Enter envia e Shift+Enter quebra a linha.
  - **Sessão:** cada carregamento da página abre uma sessão nova (`sessionId` aleatório gerado no navegador).
  - **Falha de rede do navegador:** a mensagem de indisponibilidade aparece como fala do bot.
- **DEM-RF-10** — Formatação das respostas, numa função pura e testada (`formatarMensagem`), fiel ao WhatsApp, que é o formato que o prompt pede:
  - `*texto*` vira **negrito** e `_texto_` vira *itálico*;
  - quebras de linha são preservadas, e as quebras "duras" do markdown (`  \n`) que o Chat Teste insere são normalizadas;
  - o código Pix (`000201…6304XXXX`) vira um bloco próprio com o botão **"Copiar código Pix"**;
  - nenhum HTML vindo do bot é interpretado: tudo vira texto em elementos React.
- **DEM-RF-02** — Rota **`POST /api/chat`**, um proxy até o Chat Teste do n8n:
  - **Entrada:** aceita `{ action: "sendMessage", sessionId, chatInput }`.
    - `sessionId`: 1 a 100 caracteres `[A-Za-z0-9_-]`;
    - `chatInput`: não vazio depois do trim.
  - **Repasse:** envia ao n8n só esses três campos, em `N8N_URL/webhook/<chatTesteWebhookId>/chat` (o id vem de `n8n/ids.json`), com o header `x-webhook-secret` e timeout de 60 s. Devolve o `output` da resposta.
  - **Corpo inválido** (JSON quebrado, `action` desconhecida, `sessionId` inválido ou `chatInput` vazio): **400** `{ erro }`, sem chamar o n8n.
  - **`chatInput` com mais de 1000 caracteres:** **200** com um `output` pedindo uma mensagem mais curta, sem chamar o n8n.
  - **`action: "loadPreviousSession"`:** **200** `{ data: [] }`, sem chamar o n8n.
  - **Falha do n8n** (rede, timeout, HTTP fora de 2xx ou JSON sem `output`): **200** com o `output` "Nosso atendente está indisponível agora 😕 Tente de novo em instantes." O erro vai para o log, sem segredos. O chat mostra a resposta como uma mensagem normal.
  - O contrato `{ action, sessionId, chatInput }` → `{ output }` é o do `@n8n/chat`, então o widget oficial também funcionaria apontado para esta rota.
- **DEM-RF-03** — A landing `/` ganha o botão **"Fazer um pedido"**, que leva ao `/chat`, ao lado de "Abrir painel".

### n8n na VM
- **DEM-RF-04** — Serviço **`caddy`** no `docker-compose.yml` (profile `publico`), configurado em `infra/Caddyfile`:
  - HTTPS automático (Let's Encrypt) no domínio `N8N_DOMINIO`, no formato `n8n.<ip-com-hífens>.sslip.io`;
  - só repassa ao n8n requisições em `/webhook/*` que tragam o header `x-webhook-secret` igual a `N8N_WEBHOOK_SECRET`. Todo o resto recebe **404**.

  Com isso, o editor, a API REST e o chat hospedado do n8n não ficam públicos: só a Vercel, que conhece o segredo, alcança o n8n.
- **DEM-RF-05** — O `N8N_WEBHOOK_URL` do n8n passa a ser configurável no compose. O padrão continua `http://localhost:5678/`.
- **DEM-RF-06** — Scripts da VM:
  - `scripts/vm-provisionar.sh` roda **na VM** e é idempotente:
    - cria swap de 2 GB quando a RAM é menor que 4 GB;
    - libera as portas 80 e 443 no iptables e persiste a regra (as imagens Ubuntu da Oracle bloqueiam essas portas por padrão);
    - instala Docker e o plugin compose pelos pacotes do Ubuntu.
  - `scripts/vm-deploy.sh` roda **na máquina local**:
    - envia por rsync `docker-compose.yml`, `infra/` e `n8n/`;
    - gera na VM um `.env` com permissão 600, só com as variáveis do n8n tiradas do `.env.demo.local`;
    - executa `docker compose --profile publico up -d`.

### Ambiente da demo
- **DEM-RF-07** — O arquivo `.env.demo.local` guarda os valores da demo. Ele é ignorado pelo git e tem permissão 600.
  - Os segredos são **novos** e diferentes dos do `.env` local: `SESSION_SECRET`, `BOT_API_KEY`, `N8N_WEBHOOK_SECRET`, `POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY` e a senha do admin.
  - A chave do Gemini é a mesma do `.env` local, então a cota é compartilhada.
- **DEM-RF-08** — Projeto **`container-lanches`** na Vercel.
  - As variáveis de produção vêm do `.env.demo.local`: `APP_URL`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ADMIN_*`, `SESSION_SECRET`, `BOT_API_KEY`, `N8N_URL`, `N8N_WEBHOOK_SECRET`, `PAGAMENTO_PROVEDOR` e `ABACATEPAY_DEV_MODE`.
  - Também entra `ENABLE_EXPERIMENTAL_COREPACK=1`, para a Vercel usar o pnpm 11 do `packageManager`.
  - O script `scripts/demo-vercel-env.sh` aplica as variáveis sem imprimir os valores.
- **DEM-RF-09** — Turso: as migrations e o seed demo são aplicados da máquina local, com as variáveis do `.env.demo.local`.

- **DEM-RF-11** — `pnpm demo:limpar` deixa o banco da demo pronto para uma nova apresentação:
  - sem `--sim`, só mostra quantos pedidos, pagamentos e clientes existem (nada muda);
  - com `--sim`, apaga pedidos, itens de pedido, pagamentos, clientes e eventos processados, e reinicia a numeração em #0001;
  - também reabre a loja e marca todos os itens como disponíveis, desfazendo o passo 5 do roteiro;
  - não toca no cardápio nem na configuração da loja.

## Requisitos não funcionais
- **DEM-RNF-01** — Custo zero, dentro da Constituição IV: Vercel Hobby, Turso free, Oracle Always Free, Gemini free tier, sslip.io e Let's Encrypt.
- **DEM-RNF-02** — Nenhum segredo no git, nos logs ou na saída dos scripts (Constituição V).
- **DEM-RNF-03** — O ambiente local não muda: `pnpm dev` e `pnpm infra:up` (sem o profile `publico`) funcionam como antes.
- **DEM-RNF-04** — `pnpm typecheck`, `lint`, `test` e `build` continuam verdes.

## Critérios de aceite
- **CA-01 (auto)** — Dado o proxy com fetch falso, quando envio uma mensagem válida, então ele chama `<N8N_URL>/webhook/<id>/chat` só com `action`, `sessionId` e `chatInput` e com o `x-webhook-secret`, e devolve o `output`.
- **CA-02 (auto)** — Dado um corpo inválido (JSON quebrado, `action` desconhecida, `sessionId` inválido ou `chatInput` vazio), então a resposta é 400 e o n8n não é chamado. Dado um `chatInput` com mais de 1000 caracteres, então a resposta é 200 com o pedido de mensagem mais curta, sem chamar o n8n.
- **CA-03 (auto)** — Dado o n8n fora do ar, em timeout, respondendo HTTP 500 ou sem `output`, então a resposta é 200 com a mensagem de indisponibilidade.
- **CA-04 (auto)** — Dado `loadPreviousSession`, então a resposta é `{ data: [] }` e o n8n não é chamado.
- **CA-05** — Dado o `/chat` local com o n8n local, quando escrevo "oi", então o atendente responde no chat, nos dois temas, e a página não rola na horizontal em 390 px (`pnpm e2e:chat`).
- **CA-09 (auto)** — Dado `formatarMensagem`:
  - `*Pizzas*` vira um trecho em negrito;
  - `  \n` vira uma quebra simples;
  - um asterisco solto ("5 * 3") continua texto;
  - um código Pix no meio da resposta vira um bloco `pix` separado;
  - `<b>x</b>` continua texto literal.
- **CA-06** — Dado o Caddy na VM:
  - `GET https://<N8N_DOMINIO>/` devolve 404;
  - `POST /webhook/<id>/chat` sem o header devolve 404;
  - com o header, devolve a resposta do agente.
- **CA-07** — Dado o link público da Vercel, quando faço um pedido pelo `/chat`, então:
  - o pedido aparece no painel público em "Aguardando pagamento", com o selo TESTE;
  - "Simular pagamento" leva o pedido para "Pagos — novos";
  - os próximos status avançam normalmente.
- **CA-08** — Dado o painel público sem login, então `/admin` redireciona para `/login`, e `/api/bot/*` sem api-key devolve 401.

- **CA-10** — Dado o banco da demo com pedidos, quando rodo `pnpm demo:limpar` sem `--sim`, então nada muda. Com `--sim`, o painel fica vazio, a loja aberta, todos os itens disponíveis, e o próximo pedido é o #0001.

## Fora de escopo
- Domínio próprio.
- WhatsApp real na demo.
- AbacatePay na demo (dá para ligar depois trocando `PAGAMENTO_PROVEDOR`).
- Limite de requisições por IP no chat. O risco foi aceito: esgotar a cota gratuita do Gemini só faz o atendente responder com a mensagem de instabilidade.
- Deploy automático por CI (o deploy é manual, pela CLI).
- Backups.

## Riscos
- **Vercel Hobby** é só para uso não comercial. Uma demo de PoC é zona cinzenta; para produção, use o plano Pro ou outro host Node (já anotado em `docs/deploy.md`).
- **Capacidade ARM da Oracle:** quando falta, a alternativa é a `E2.1.Micro` (1 GB de RAM + swap).
- **Cota do Gemini:** é compartilhada com o ambiente local. No dia da apresentação, evite testes locais pesados.

## Histórico
- 2026-10-22 — versão inicial.
- 2026-10-22 — Antes de implementar, o widget `@n8n/chat` foi trocado por um chat próprio em React (DEM-RF-01, DEM-RF-10, CA-09). Motivos:
  - o pacote puxa Vue, highlight.js e o `@n8n/design-system` inteiro;
  - o markdown dele transforma o `*negrito*` do WhatsApp em itálico;
  - o tema não acompanharia o switch sem CSS frágil.

  O contrato do proxy não mudou.
