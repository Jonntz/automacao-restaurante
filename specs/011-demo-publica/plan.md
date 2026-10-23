# 011 — Plano técnico

## Topologia
```
Navegador (apresentador/cliente)
   │  https://container-lanches.vercel.app   (/, /chat, /login, /admin)
   ▼
Vercel (Next.js) ───────────────► Turso (libsql://…)
   │  /api/chat  ─┐
   │  notificar   ├─ x-webhook-secret ──► VM Oracle: Caddy :443 (n8n.<ip>.sslip.io, só /webhook/* com o segredo)
   │              ┘                            │
   ▲                                           ▼
   └──── /api/bot/* (x-api-key) ◄────────── n8n + Postgres (docker compose, n8n em 127.0.0.1:5678)
                                               │
                                               ▼
                                         Gemini (free tier)
```

## Arquivos
```
src/lib/chat/proxy.ts                # encaminharChat(corpo, deps): validação + repasse + respostas amigáveis (DEM-RF-02)
src/app/api/chat/route.ts            # rota fina: lê o JSON, chama encaminharChat, devolve status/corpo
tests/chat/proxy.test.ts             # CA-01…CA-04 com fetch falso
src/lib/chat/formatar.ts             # formatarMensagem(texto): blocos de linhas/trechos + bloco pix (DEM-RF-10)
tests/chat/formatar.test.ts          # CA-09
src/app/chat/page.tsx                # página pública: cabeçalho da marca + <Conversa/>
src/app/chat/conversa.tsx            # client: estado das mensagens, envio para /api/chat, sugestões, "digitando"
src/app/chat/mensagem.tsx            # renderiza os blocos de formatarMensagem (negrito, itálico, Pix com "Copiar")
src/app/page.tsx                     # botão "Fazer um pedido"
infra/Caddyfile                      # HTTPS + filtro por caminho e header (DEM-RF-04)
docker-compose.yml                   # serviço caddy (profile publico) + N8N_WEBHOOK_URL configurável
scripts/vm-provisionar.sh            # swap, iptables, Docker (roda na VM)
scripts/vm-deploy.sh                 # rsync + .env da VM + compose up (roda local)
scripts/demo-vercel-env.sh           # variáveis de produção na Vercel sem imprimir valores
scripts/e2e-chat.mjs                 # CA-05: abre /chat, manda "oi", espera resposta, troca o tema
scripts/smoke-chat.ts                # aceita SMOKE_CHAT_URL (conversa pelo /api/chat da Vercel)
docs/deploy.md                       # reescrito para esta topologia
docs/roteiro-demo.md                 # roteiro para quem apresenta
```

## Decisões
- **O proxy fica no Next.js, e não o chat hospedado do n8n.** O cliente recebe um único domínio, e o n8n não precisa expor nada sem segredo. O mesmo `/chat` funciona localmente (com `N8N_URL=http://localhost:5678`).
- **Falha vira mensagem, não erro HTTP.** O widget do `@n8n/chat` mostra o `output` como uma mensagem do bot. Se a rota devolvesse 5xx, a pessoa veria um erro genérico em inglês. Só um corpo malformado, que nunca vem do widget, recebe 400.
- **O segredo é checado no Caddy.** Os workflows "WhatsApp Entrada" e "Notificar Cliente" já conferem o `x-webhook-secret`, mas o Chat Trigger não tem esse filtro. Exigir o header na borda protege todos os webhooks de uma vez e esconde o editor do n8n (tudo que não é `/webhook/*` recebe 404).
- **O chat hospedado do n8n continua no workflow** (`mode: hostedChat`). Ele serve ao uso local e ao `pnpm smoke`; na VM fica inacessível pelo filtro do Caddy. O POST de mensagem é o mesmo nos dois modos.
- **Chat próprio em vez do `@n8n/chat`** (Histórico da spec). Componentes shadcn com os tokens do tema seguem o switch claro/escuro sem CSS extra. O `formatarMensagem` interpreta a formatação do WhatsApp (`*negrito*`, `_itálico_`), que é a que o prompt manda o bot usar, e nunca injeta HTML.
- **Sessão:** um `sessionId` (`crypto.randomUUID()`) é gerado no primeiro envio, e não durante o render, porque o prerender do Cache Components rejeita valores aleatórios. O Chat Teste vira `telefone = teste:<sessionId>`, e o pedido aparece com o selo TESTE.
- **pnpm 11 na Vercel:** `ENABLE_EXPERIMENTAL_COREPACK=1` faz a Vercel usar a versão do `packageManager`. O build roda na Vercel (Linux), o que instala o binário nativo certo do libSQL. Por isso não usamos `--prebuilt`.
- **Funções da Vercel em São Paulo (`gru1`, no `vercel.json`).** O banco do Turso foi criado em `aws-sa-east-1` e a VM está na Oracle São Paulo. No padrão (`iad1`, EUA), cada consulta cruzaria o continente. O Hobby permite escolher uma região.
- **VM pequena:** a Oracle entregou a `E2.1.Micro` (1 GB de RAM e disco lento). Para caber nela:
  - o `vm-provisionar.sh` cria 2 GB de swap;
  - `N8N_RUNNERS_GRANT_TOKEN_TTL=120`, porque o task runner dos nós Code levava mais que os 30 s padrão para subir;
  - o SSH do deploy usa `ServerAliveInterval`, porque o bootstrap fica muito tempo sem saída e a conexão ociosa caía.
- **Docker na VM** vem dos pacotes do Ubuntu (`docker.io` e `docker-compose-v2`), sem baixar e executar script remoto.
- **iptables na Oracle:** a imagem Ubuntu tem uma regra `REJECT` no fim da chain `INPUT`. As regras de 80/443 entram **antes** dela (`-I INPUT 6`) e são persistidas com `netfilter-persistent save`.

## Sequência de deploy
1. **Turso:** a pessoa usuária cria o banco e o token no painel e cola no `.env.demo.local`. Depois rodamos `pnpm db:migrate` e `pnpm db:seed` com essas variáveis.
2. **Vercel:**
   - `vercel link` (projeto `container-lanches`);
   - `scripts/demo-vercel-env.sh`;
   - `vercel deploy --prod`;
   - gravar `APP_URL` e fazer redeploy.
3. **VM:**
   - preencher `N8N_DOMINIO` a partir do IP;
   - `scripts/vm-deploy.sh` (o provisionamento roda na primeira vez);
   - conferir o log "published workflows".
4. **Vercel:** `N8N_URL=https://<N8N_DOMINIO>` e redeploy.
5. **Verificação:** CA-06, CA-07 e CA-08.

## Riscos
- **Rate limit de certificados do sslip.io:** o sslip.io está na Public Suffix List, então o limite do Let's Encrypt vale por subdomínio e não é compartilhado.
