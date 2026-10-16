# ROADMAP

Legenda: ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ⛔ bloqueada

## Ordem e dependências

```
001 fundacao ──► 002 cardapio-e-pedidos ──► 003 pagamento-pix ──► 004 api-do-bot ──┬──► 005 painel-admin
      │                                                                             │
      └──────────────► 006 n8n-infra ─────────────────────────────────────────────► 007 agente-ia ──► 008 whatsapp
                                                                                                         │
                                                              (todas) ──────────────────────────────► 009 entrega-poc
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
| 005 | [painel-admin](005-painel-admin/tasks.md) | ✅ | 22/22 | `pnpm e2e:admin` verde; 3 defeitos de UI corrigidos |
| 006 | [n8n-infra](006-n8n-infra/tasks.md) | ⬜ | 0/11 | |
| 007 | [agente-ia](007-agente-ia/tasks.md) | ⬜ | 0/10 | Precisa de `GEMINI_API_KEY` para o VERIF manual |
| 008 | [whatsapp](008-whatsapp/tasks.md) | ⬜ | 0/15 | Precisa de app Meta + `NGROK_*` para o VERIF manual |
| 009 | [entrega-poc](009-entrega-poc/tasks.md) | 🟨 | 1/10 | CLAUDE.md criado na Etapa 1 |

**Total:** 102/147 tarefas.

## Credenciais externas (o usuário providencia)

| Credencial | Necessária para | Gratuita? | Guia |
|---|---|---|---|
| `GEMINI_API_KEY` | Agente (007) | Sim, AI Studio | docs/setup-gemini.md |
| App Meta + número de teste | WhatsApp real (008) | Sim | docs/setup-meta-whatsapp.md |
| `NGROK_AUTHTOKEN` + domínio estático | Webhooks públicos (006/008) | Sim | README |
| `ABACATEPAY_API_KEY` (dev) | Pix real em sandbox (003) | Sim | docs/setup-abacatepay.md |

Sem as credenciais de Meta, ngrok e AbacatePay, a PoC continua testável pelo **Caminho rápido**: provedor `mock` + Chat Teste.
