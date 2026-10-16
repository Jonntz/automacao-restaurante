# Deploy gratuito (opcional)

A PoC foi feita para rodar **localmente**. Este guia leva o projeto para a nuvem **sem custo**, para uma demonstração contínua.

```
Cliente ─► Meta ─► Vercel (Next.js) ──► Turso (banco)
                     │  ▲
       webhooks/notif│  │ /api/bot/* (x-api-key)
                     ▼  │
              VM Oracle Always Free: Caddy (HTTPS, só /webhook/*) ─► n8n + Postgres (docker compose)
```

| Peça | Serviço gratuito | Observação |
|---|---|---|
| Next.js | Vercel **Hobby** | Apenas **uso não comercial**. Para um restaurante real, use Pro ou outro host Node |
| Banco | Turso (free) | Mesmo cliente libSQL do ambiente local |
| n8n + Postgres | Oracle Cloud **Always Free** (VM Ampere A1) | Roda o mesmo `docker-compose.yml` |
| HTTPS do n8n | Caddy + subdomínio `sslip.io` | Certificado Let's Encrypt automático |

## 1. Banco no Turso
```bash
brew install tursodatabase/tap/turso      # ou: curl -sSfL https://get.tur.so/install.sh | bash
turso auth signup
turso db create burger-demo
turso db show burger-demo --url           # → libsql://burger-demo-<usuario>.turso.io
turso db tokens create burger-demo        # → token
```
Aplique o schema e o seed **a partir da sua máquina**:
```bash
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... pnpm db:migrate
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... pnpm db:seed
```

## 2. n8n numa VM Always Free da Oracle
1. Crie a conta em <https://www.oracle.com/cloud/free/>. Uma VM **Ampere A1** (ARM, Ubuntu) está no Always Free.
2. Libere as portas **80** e **443** na *Security List* da VCN e no firewall da VM:
   ```bash
   sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT
   ```
3. Instale o Docker (`curl -fsSL https://get.docker.com | sh`), clone o repositório e crie o `.env` com `pnpm env:init`, ou copie o seu, mudando:
   ```env
   NEXT_API_URL=https://<seu-app>.vercel.app
   ```
4. `docker compose up -d`. A porta do n8n continua presa em `127.0.0.1`.
5. Instale o Caddy (`sudo apt install caddy`). Em `/etc/caddy/Caddyfile`, troque `<IP>` pelo IP público com pontos trocados por hífens, por exemplo `n8n.129-146-10-20.sslip.io`:
   ```caddyfile
   n8n.<IP>.sslip.io {
       # Só os webhooks internos ficam públicos (protegidos por x-webhook-secret).
       @webhooks path /webhook/*
       handle @webhooks {
           reverse_proxy 127.0.0.1:5678
       }
       handle {
           respond 404
       }
   }
   ```
   `sudo systemctl reload caddy`. **A UI do n8n não fica pública.** Para acessá-la, use um túnel SSH:
   ```bash
   ssh -L 5678:127.0.0.1:5678 ubuntu@<IP>   # depois abra http://localhost:5678
   ```

## 3. Next.js na Vercel
1. Importe o repositório em <https://vercel.com/new>. A Vercel detecta o Next.js sozinha.
2. Configure as variáveis de ambiente (tabela abaixo) e faça o deploy.
3. A URL `https://<seu-app>.vercel.app` substitui o túnel ngrok.

## 4. Apontar Meta e AbacatePay para a Vercel
- **Meta → Webhook:** `https://<seu-app>.vercel.app/api/webhooks/whatsapp`
- **AbacatePay → Webhook:** `https://<seu-app>.vercel.app/api/webhooks/abacatepay?webhookSecret=<ABACATEPAY_WEBHOOK_SECRET>`

## Checklist de variáveis por ambiente
| Variável | Local | Vercel | VM do n8n |
|---|---|---|---|
| `APP_URL` | `http://localhost:3000` | `https://<seu-app>.vercel.app` | — |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | `file:./local.db` / vazio | `libsql://…` / token | — |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `SESSION_SECRET` | ✔ | ✔ | — |
| `BOT_API_KEY` | ✔ | ✔ (mesmo valor) | ✔ (mesmo valor) |
| `N8N_URL` | `http://localhost:5678` | `https://n8n.<IP>.sslip.io` | — |
| `N8N_WEBHOOK_SECRET` | ✔ | ✔ (mesmo valor) | ✔ (mesmo valor) |
| `NEXT_API_URL` | `http://host.docker.internal:3000` | — | `https://<seu-app>.vercel.app` |
| `PAGAMENTO_PROVEDOR` / `ABACATEPAY_*` | ✔ | ✔ | — |
| `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | ✔ | ✔ | — |
| `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` | ✔ | — | ✔ |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | ✔ | — | ✔ |
| `POSTGRES_*` / `N8N_ENCRYPTION_KEY` | ✔ | — | ✔ |
| `NGROK_*` | opcional | — | — |

> Links oficiais: [Vercel — limites do Hobby](https://vercel.com/docs/limits/fair-use-guidelines) · [Turso — preços](https://turso.tech/pricing) · [Oracle Always Free](https://www.oracle.com/cloud/free/) · [Caddy — reverse proxy](https://caddyserver.com/docs/quick-starts/reverse-proxy). Conferido em 2026-10-16; verifique os limites atuais antes de usar.
