# 001 — Plano técnico

## Dependências (versões verificadas em 2026-10-16)
| Pacote | Versão alvo | Uso |
|---|---|---|
| next / react / react-dom | 16.4.x / 19.x | App Router, route handlers, server actions, `proxy.ts` |
| typescript | 5.x | strict |
| tailwindcss | 4.x | estilos (via create-next-app) |
| shadcn (CLI) | 4.x | componentes de UI (Button, Card, Sheet, Dialog, Input, Switch, Badge, Sonner…) |
| drizzle-orm / drizzle-kit | 0.45.x / 0.31.x | ORM + migrations (`dialect: "turso"`) |
| @libsql/client | 0.18.x | conexão `file:` / `libsql:` / `:memory:` |
| zod | 4.x | validação |
| vitest | 5.x | testes (`environment: node`) |
| tsx | latest | rodar scripts TS (seed, migrate, smoke) |

## Estrutura criada nesta feature
```
src/
  app/{layout.tsx, page.tsx}             # page.tsx: landing simples com link para /admin
  lib/
    env.ts                               # leitores zod por domínio: env.banco(), env.admin(), ...
    dinheiro.ts                          # formatarCentavos, parseReais
    pedido-numero.ts                     # numeroPedido
    db/
      schema.ts                          # tabelas + enums (data-model.md)
      client.ts                          # criarDb(url, token) + db singleton (lazy)
      migrar.ts                          # aplica migrations (usado por script e por testes)
      seed.ts                            # seedDemo(db) idempotente + main()
drizzle/                                 # SQL gerado por drizzle-kit
drizzle.config.ts
tests/
  helpers/db.ts                          # criarDbTeste()
  fundacao/{dinheiro,pedido-numero,seed,env}.test.ts
vitest.config.ts
.env.example
```

## Decisões
- **`criarDb(url, authToken?)`** devolve `{ db, client }`, com `db = drizzle(client, { schema })`. O singleton `db` é criado sob demanda (`getDb()`) para não quebrar o build quando a env não existir. Todas as funções de domínio recebem `db` por parâmetro (injeção), o que permite testar com `criarDbTeste()`.
- **Migrations em teste:** `migrate(db, { migrationsFolder: 'drizzle' })` de `drizzle-orm/libsql/migrator` sobre `:memory:`. Cada `criarDbTeste()` cria um client novo, e isso garante o isolamento.
- **Foreign keys:** o SQLite exige `PRAGMA foreign_keys = ON` por conexão, então ele é executado em `criarDb`.
- **Seed idempotente:** upsert por chave natural (`configuracoes.id = 1`, `categorias.nome`, `(categoria_id, nome)`) com `onConflictDoNothing`. O seed não sobrescreve edições feitas no admin.
- **`db:reset`:** apaga `local.db*` (só quando `DATABASE_URL` começa com `file:`), migra e roda o seed.
- **`env.ts`:** cada função valida só um grupo de variáveis e guarda o resultado em cache. As mensagens de erro listam as chaves que faltam e apontam para `.env.example`.
- **`parseReais`:** remove `R$` e espaços. Se houver vírgula, os pontos são separadores de milhar; sem vírgula, o ponto é o decimal. Valida com regex `^\d+([.,]\d{1,2})?$` e converte com aritmética de inteiros (string → reais × 100 + centavos), nunca com `parseFloat × 100`.

## Next 16.4 com Cache Components (lido em `node_modules/next/dist/docs`, 2026-10-16)
O template do Next 16.4 já vem com `cacheComponents: true` e `partialPrefetching: true`. Mantemos assim, porque será o padrão no próximo major, e seguimos estas regras:
- **Páginas com dados dinâmicos** (banco, cookies): o shell é estático e a parte dinâmica fica num componente dentro de `<Suspense>`, que chama `await connection()` antes de ler o banco ou usar `new Date()`. Ler `cookies()` fora de um `<Suspense>` dá erro de build.
- **Route handlers:** ler `request` (headers, corpo, URL) antes de qualquer IO, o que os torna dinâmicos. Nada de `export const runtime` (é proibido com Cache Components; o runtime é sempre Node).
- **Proxy:** `src/proxy.ts` exportando `proxy()`. O runtime é Node por padrão, e a opção `runtime` não é aceita.
- **Server actions:** revalidam a sessão por conta própria (o guia de autenticação do Next exige isso).
- O arquivo `AGENTS.md`, gerado pelo `next dev`, é versionado.

## Riscos
- Se `create-next-app` não aceitar diretório não vazio (já existe `specs/`), gerar num diretório temporário e mover os arquivos para a raiz. *(Foi o que aconteceu.)*
- Alguma versão do Drizzle pode ter API de migrator diferente para libSQL. Se acontecer, consultar a documentação e ajustar o `migrar.ts`.
