# CLAUDE.md

PoC de automação de restaurante: um chatbot de WhatsApp com IA (n8n + Gemini), pedidos e Pix (AbacatePay), e um painel admin em Next.js.

## Spec-Driven Development (obrigatório)
- **Antes de codar**, leia `specs/constitution.md` e as três peças da feature (`specs/NNN-*/spec.md`, `plan.md` e `tasks.md`).
- Trabalhe **tarefa por tarefa** na ordem do `tasks.md` e marque `[x]` ao concluir. Ao fim de cada feature, atualize `specs/ROADMAP.md`.
- Se a implementação contradisser a spec, **atualize a spec primeiro** (seção "Histórico") e só depois altere o código.
- Lógica de domínio usa TDD: o teste falha primeiro e depois passa.
- Commits: `feat(NNN): ...`, `docs(NNN): ...`.

## Fronteiras (Constituição X)
- O **Next.js** é dono das regras, do banco, do painel e dos gateways de webhook. Ele nunca chama a Meta para enviar mensagem.
- O **n8n** é dono da conversa (LLM, memória, ferramentas) e do envio de WhatsApp. Ele nunca acessa o banco; usa apenas `/api/bot/*`.
- A **IA nunca define preço**. Dinheiro é sempre em centavos inteiros.

## Comandos
```bash
pnpm dev                 # Next.js em :3000
pnpm test                # Vitest
pnpm typecheck && pnpm lint
pnpm db:reset            # recria local.db + seed demo
pnpm infra:up            # Postgres + n8n (bootstrap importa as credenciais e os workflows)
pnpm n8n:export          # traz para o git os workflows editados na UI
pnpm tunel:up            # ngrok → :3000 (precisa de NGROK_* no .env)
```

## Onde está o quê
- `src/lib/**`: domínio; as funções recebem `db` e dependências por parâmetro.
- `src/app/api/**`: rotas finas (parse → domínio → resposta).
- `n8n/workflows/*.json`: workflows versionados; `n8n/prompts/atendente.md` é a fonte do system prompt.
- `tests/**`: Vitest; use `criarDbTeste()` para ter um banco em memória isolado.
