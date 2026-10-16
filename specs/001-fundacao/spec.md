# 001 — Fundação

## Objetivo
Montar a base do projeto: app Next.js, testes, banco libSQL com schema e seed demo, validação de ambiente e utilitários de dinheiro. As outras features são construídas em cima disso.

## Histórias
- **H1.** Como dev, quero clonar o repo, copiar `.env.example` para `.env`, rodar `pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev` e ver o app no ar com um cardápio demo.
- **H2.** Como dev, quero `pnpm test` rodando rápido, com banco em memória isolado por teste.
- **H3.** Como dev, quero trocar o banco local pelo Turso mudando só `DATABASE_URL` e `DATABASE_AUTH_TOKEN`.

## Requisitos funcionais
- **FUN-RF-01** — Projeto Next.js 16 com App Router, TypeScript strict, código em `src/`, gerenciado por pnpm, Tailwind CSS 4 e shadcn/ui inicializado.
- **FUN-RF-02** — Vitest configurado com o alias `@/` e um helper `criarDbTeste()`, que entrega um banco libSQL `:memory:` com as migrations aplicadas e um banco novo por chamada.
- **FUN-RF-03** — Um único módulo de banco (`src/lib/db/client.ts`) cria a conexão a partir de `DATABASE_URL`, mais `DATABASE_AUTH_TOKEN` opcional. Aceita `file:`, `libsql://` e `:memory:`.
- **FUN-RF-04** — Schema Drizzle conforme [data-model.md](data-model.md), com migrations SQL versionadas em `drizzle/`.
- **FUN-RF-05** — Seed **idempotente** do restaurante demo "Burger Demo": a configuração mais 4 categorias e 13 itens.
- **FUN-RF-06** — `src/lib/env.ts` valida as variáveis com zod e falha cedo, com mensagem clara que lista as que faltam. Cada módulo valida só o que usa (`env.banco()`, `env.admin()`, …), para que os testes não exijam o `.env` completo.
- **FUN-RF-07** — `.env.example` documenta **todas** as variáveis de [arquitetura.md](../arquitetura.md#variáveis-de-ambiente), com comentários e valores fictícios.
- **FUN-RF-08** — Utilitários de dinheiro em `src/lib/dinheiro.ts`:
  - `formatarCentavos(n)` devolve, por exemplo, `"R$ 25,90"`;
  - `parseReais("25,90" | "25.90" | "R$ 25,90")` devolve `2590`, ou `null` quando inválido.

  Não usa float em soma.
- **FUN-RF-09** — Scripts pnpm: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `db:generate`, `db:migrate`, `db:seed`, `db:reset`.
- **FUN-RF-10** — Utilitário `numeroPedido(id)` devolve `"#0012"`.

## Requisitos não funcionais
- **FUN-RNF-01** — `pnpm typecheck`, `pnpm lint` e `pnpm test` passam sem erros nem warnings de tipo.
- **FUN-RNF-02** — A suíte de testes da fundação roda em menos de 10 s.
- **FUN-RNF-03** — `local.db*` e `.env` ficam no `.gitignore`.

## Critérios de aceite
- **CA-01** — Dado um clone limpo com `.env` copiado do exemplo, quando rodo install, migrate, seed e dev, então `GET /` responde 200.
- **CA-02** — Dado um banco já seedado, quando rodo `pnpm db:seed` de novo, então o número de categorias e itens continua o mesmo.
- **CA-03** — Dados dois testes que gravam dados, quando cada um usa `criarDbTeste()`, então um não enxerga os dados do outro.
- **CA-04** — `formatarCentavos`:

  | Entrada | Saída |
  |---|---|
  | `0` | `"R$ 0,00"` |
  | `590` | `"R$ 5,90"` |
  | `123456` | `"R$ 1.234,56"` |

- **CA-05** — `parseReais`:

  | Entrada | Saída |
  |---|---|
  | `"25,90"` | `2590` |
  | `"25.9"` | `2590` |
  | `"R$ 1.234,56"` | `123456` |
  | `"abc"` | `null` |
  | `"-1"` | `null` |

- **CA-06** — Dado `DATABASE_URL` ausente, quando o módulo de banco é carregado em runtime, então o erro diz claramente qual variável falta.

## Casos de borda
- Separador decimal com vírgula ou ponto; separador de milhar com ponto (`1.234,56`).
- `numeroPedido(1)` devolve `"#0001"`; `numeroPedido(12345)` devolve `"#12345"`, sem truncar.

## Fora de escopo
CI/CD, Docker para o Next.js, i18n.

## Histórico
- 2026-10-16 — versão inicial.
