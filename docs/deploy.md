# Deploy da demonstração pública (custo zero)

A PoC roda localmente por padrão. Este guia publica um **link para o cliente**, com o chat de pedidos (`/chat`) e o painel (`/admin`) sempre no ar e sem depender da sua máquina. O desenho e as decisões estão em [specs/011-demo-publica](../specs/011-demo-publica/spec.md) e no ADR-10 de [specs/arquitetura.md](../specs/arquitetura.md).

```
Navegador ──► Vercel (Next.js: /, /chat, /admin, /api/*) ──► Turso (banco)
                 │  /api/chat e notificações (x-webhook-secret)
                 ▼
          VM Oracle Always Free: Caddy :443 ──► n8n + Postgres (docker compose)
                 ▲  só /webhook/* com o segredo; o resto é 404      │
                 └──────── /api/bot/* (x-api-key) ◄─────────────────┘──► Gemini
```

| Peça | Serviço gratuito | Observação |
|---|---|---|
| Next.js | Vercel **Hobby** | Só para **uso não comercial**. Em produção, use o plano Pro ou outro host Node |
| Banco | Turso (free) | Mesmo cliente libSQL do ambiente local |
| n8n + Postgres | Oracle Cloud **Always Free** | Roda o mesmo `docker-compose.yml`, com o profile `publico` |
| HTTPS do n8n | Caddy + `sslip.io` | Certificado Let's Encrypt automático, sem precisar de domínio |

## 0. Arquivo da demo
Tudo sai do `.env.demo.local`. Ele é ignorado pelo git, tem permissão 600 e usa **segredos próprios**, diferentes do `.env`. Para criá-lo, copie a estrutura descrita na spec 011 (DEM-RF-07) e gere segredos novos, por exemplo com `openssl rand -base64 32`. A chave do Gemini pode ser a mesma do `.env`, mas aí a cota diária é compartilhada.

## 1. Banco no Turso
1. Entre em <https://app.turso.tech>, crie o banco `container-lanches` e gere um token com leitura e escrita.
2. Preencha `DATABASE_URL` (`libsql://…`) e `DATABASE_AUTH_TOKEN` no `.env.demo.local`.
3. Aplique o schema e o cardápio da pizzaria:
   ```bash
   pnpm demo:db
   ```

## 2. Next.js na Vercel
```bash
npm i -g vercel                       # CLI
vercel login
vercel link --yes --project container-lanches
pnpm demo:vercel-env                  # grava as variáveis de produção (não imprime valores)
vercel deploy --prod                  # mostra a URL, ex.: https://container-lanches.vercel.app
```
Depois do primeiro deploy:
1. Coloque a URL em `APP_URL=` no `.env.demo.local`.
2. Rode `pnpm demo:vercel-env APP_URL && vercel deploy --prod`.

## 3. n8n numa VM Oracle Always Free
1. Crie a conta em <https://www.oracle.com/cloud/free/>. A *home region* não muda depois.
2. Vá em **Compute → Instances → Create instance**:
   - **Image:** Ubuntu 24.04.
   - **Shape:** `VM.Standard.A1.Flex` (Ampere) com 2 OCPU e 12 GB. Se faltar capacidade, troque o *Availability Domain* ou use `VM.Standard.E2.1.Micro`; o script cria swap.
   - **SSH:** *Generate a key pair* e baixe a chave privada.
   - **Rede:** *Assign a public IPv4 address*.
3. Libere as portas: *Subnet → Security List → Add Ingress Rules*, com origem `0.0.0.0/0`, TCP, portas `80,443`.
4. No `.env.demo.local`, preencha:
   - `VM_IP`: o IP público;
   - `VM_CHAVE`: o caminho da chave;
   - `N8N_DOMINIO`: `n8n.<IP com hífens>.sslip.io`, por exemplo `n8n.129-146-10-20.sslip.io`.
5. Suba o n8n:
   ```bash
   pnpm demo:vm
   ```
   O comando:
   - prepara a VM: swap, iptables (a imagem da Oracle bloqueia 80/443) e Docker pelos pacotes do Ubuntu;
   - envia `docker-compose.yml`, `infra/` e `n8n/`;
   - gera o `.env` da VM só com as variáveis do n8n;
   - roda `docker compose --profile publico up -d`, reimporta os workflows e reinicia o n8n.
6. Aponte a Vercel para o n8n:
   ```bash
   pnpm demo:vercel-env N8N_URL && vercel deploy --prod
   ```

## 4. Verificar
```bash
APP=https://container-lanches.vercel.app      # a sua URL
curl -s -o /dev/null -w '%{http_code}\n' https://<N8N_DOMINIO>/        # 404: o editor não é público
E2E_BASE_URL=$APP pnpm e2e:chat                                       # /chat responde (gasta cota do Gemini)
SMOKE_CHAT_URL=$APP/api/chat APP_URL=$APP BOT_API_KEY=<da demo> pnpm smoke   # pedido ponta a ponta
```
Por fim, entre em `$APP/admin` com o `ADMIN_EMAIL` e a `ADMIN_PASSWORD` da demo e confira o pedido do smoke em "Aguardando pagamento".

## Atualizar a demo
| Mudou… | Rode |
|---|---|
| Código do Next.js | `vercel deploy --prod` |
| Workflow, prompt ou `docker-compose.yml` | `pnpm demo:vm` |
| Variável do painel | `pnpm demo:vercel-env <VAR> && vercel deploy --prod` |
| Cardápio | Pelo painel (`/admin/cardapio`), ou `pnpm demo:db`, que é idempotente e não apaga nada |

## Editor do n8n na VM
O editor não é público. Para abri-lo, use um túnel SSH e acesse `http://localhost:5679`:
```bash
ssh -i <VM_CHAVE> -L 5679:127.0.0.1:5678 ubuntu@<VM_IP>
```
Na primeira vez, o n8n pede para criar o usuário dono.

## WhatsApp e AbacatePay (quando houver credenciais)
- **Meta → Webhook:** `https://<app>.vercel.app/api/webhooks/whatsapp`. Grave `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` na Vercel, e `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` no `.env.demo.local` (depois rode `pnpm demo:vm`).
- **AbacatePay → Webhook:** `https://<app>.vercel.app/api/webhooks/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`. Use `PAGAMENTO_PROVEDOR=abacatepay` e `ABACATEPAY_API_KEY` na Vercel.

## Variáveis por ambiente
| Variável | Local (`.env`) | Vercel | VM do n8n |
|---|---|---|---|
| `APP_URL` | `http://localhost:3000` | URL da Vercel | URL da Vercel (logo do chat hospedado) |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | `file:./local.db` / vazio | `libsql://…` / token | — |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `SESSION_SECRET` | ✔ | ✔ (da demo) | — |
| `BOT_API_KEY` | ✔ | ✔ (mesmo valor da VM) | ✔ |
| `N8N_URL` | `http://localhost:5678` | `https://<N8N_DOMINIO>` | — |
| `N8N_WEBHOOK_SECRET` | ✔ | ✔ (mesmo valor da VM) | ✔ (o Caddy também confere) |
| `NEXT_API_URL` | `http://host.docker.internal:3000` | — | URL da Vercel |
| `N8N_DOMINIO` / `N8N_WEBHOOK_URL` | — | — | ✔ (o `vm-deploy.sh` gera) |
| `PAGAMENTO_PROVEDOR` / `ABACATEPAY_*` | ✔ | ✔ | — |
| `GEMINI_API_KEY` / `GEMINI_MODEL(_RESERVA)` | ✔ | — | ✔ |
| `POSTGRES_*` / `N8N_ENCRYPTION_KEY` | ✔ | — | ✔ |
| `ENABLE_EXPERIMENTAL_COREPACK` | — | `1` (pnpm 11) | — |

## Problemas comuns
| Sintoma | Causa e solução |
|---|---|
| O chat responde "atendente indisponível" | O n8n da VM está fora do ar ou `N8N_URL`/`N8N_WEBHOOK_SECRET` divergem. Veja na VM: `sudo docker compose logs --tail 50 n8n caddy` |
| Caddy sem certificado | Portas 80/443 fechadas na Security List da VCN. O `vm-provisionar.sh` só cuida do iptables da VM |
| "Out of capacity" na Oracle | Tente outro Availability Domain, outra hora, ou a shape `E2.1.Micro` |
| Build da Vercel falha no `pnpm install` | Confira `ENABLE_EXPERIMENTAL_COREPACK=1` (o projeto usa pnpm 11) |
| O atendente responde com a mensagem de instabilidade do Gemini | Acabou a cota diária do free tier, que é compartilhada com o ambiente local. Espere virar o dia (horário do Pacífico) ou use uma chave de outro projeto do Google |

> Links oficiais: [Vercel — limites do Hobby](https://vercel.com/docs/limits/fair-use-guidelines) · [Turso — preços](https://turso.tech/pricing) · [Oracle Always Free](https://www.oracle.com/cloud/free/) · [Caddy — reverse proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy). Conferido em 2026-10-22; verifique os limites atuais antes de usar.
