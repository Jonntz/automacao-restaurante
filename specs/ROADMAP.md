# ROADMAP

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ⛔ bloqueada

## Ordem e dependências

```
001 fundacao ──► 002 cardapio-e-pedidos ──► 003 pagamento-pix ──► 004 api-do-bot ──┬──► 005 painel-admin
      │                                                                             │
      └──────────────► 006 n8n-infra ─────────────────────────────────────────────► 007 agente-ia ──► 008 whatsapp
                                                                                                         │
                                                              (todas) ──────────────────────────────► 009 entrega-poc ──► 010 marca-e-pizzaria ──► 011 demo-publica
```

- A 006 depende só da 001 e pode correr em paralelo a 002–005.
- A 007 precisa da API do bot (004) e da infra (006).
- A 008 precisa do agente (007) e do notificador (002).

## Progresso

| # | Feature | Status | Tarefas | Observações |
|---|---|---|---|---|
| 001 | [fundacao](001-fundacao/tasks.md) | ✅ | 20/20 | Next 16.4.1 (16.4.2 barrado pela política de idade do pnpm) |
| 002 | [cardapio-e-pedidos](002-cardapio-e-pedidos/tasks.md) | ✅ | 27/27 | |
| 003 | [pagamento-pix](003-pagamento-pix/tasks.md) | ✅ | 19/19 | AbacatePay v2 testado com fetch falso; chave real pendente |
| 004 | [api-do-bot](004-api-do-bot/tasks.md) | ✅ | 13/13 | Verificado com curl contra o dev server |
| 005 | [painel-admin](005-painel-admin/tasks.md) | ✅ | 25/25 | `pnpm e2e:admin` verde; 3 defeitos de UI corrigidos |
| 006 | [n8n-infra](006-n8n-infra/tasks.md) | 🟨 | 10/11 | Verificada em Docker (Postgres 17, n8n 2.43.4); falta T006.07 (ngrok), que precisa de `NGROK_*` |
| 007 | [agente-ia](007-agente-ia/tasks.md) | ✅ | 11/11 | CA-05…CA-12 ao vivo; Flash-Lite como principal + reserva (cota por modelo) |
| 008 | [whatsapp](008-whatsapp/tasks.md) | 🟨 | 14/15 | Gateway → n8n → agente verificado; falta T008.15 (celular real), que precisa do app Meta + ngrok |
| 009 | [entrega-poc](009-entrega-poc/tasks.md) | ✅ | 11/11 | Caminho rápido do zero em 106 s; tag `poc-v0.1` |
| 010 | [marca-e-pizzaria](010-marca-e-pizzaria/tasks.md) | ✅ | 13/13 | Tema claro/escuro com switch, Chat Teste com a marca, seed de pizzaria com meio a meio |
| 011 | [demo-publica](011-demo-publica/tasks.md) | ✅ | 14/14 | No ar: container-lanches.vercel.app + Turso + n8n na VM Oracle; roteiro do apresentador verificado no link público |

**Total:** 177/179 tarefas. As 2 restantes dependem de credenciais externas: ngrok (006) e o app da Meta (008).

## Credenciais externas (o usuário providencia)

| Credencial | Necessária para | Gratuita? | Guia |
|---|---|---|---|
| `GEMINI_API_KEY` | Agente (007) | Sim, AI Studio | docs/setup-gemini.md |
| App Meta + número de teste | WhatsApp real (008) | Sim | docs/setup-meta-whatsapp.md |
| `NGROK_AUTHTOKEN` + domínio estático | Webhooks públicos (006/008) | Sim | README |
| `ABACATEPAY_API_KEY` (dev) | Pix real em sandbox (003) | Sim | docs/setup-abacatepay.md |

Sem as credenciais de Meta, ngrok e AbacatePay, a PoC continua testável pelo **Caminho rápido**: provedor `mock` + Chat Teste.
