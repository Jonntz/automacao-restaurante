# 004 — Plano técnico

## Arquivos
```
src/lib/bot/
  autenticacao.ts     # exigirApiKey(request) → Response 401 | null
  entrada.ts          # schemas zod tolerantes: esquemaRevisar, esquemaCriar (z.preprocess p/ string JSON, aliases, coerção)
  apresentacao.ts     # apresentarContexto, apresentarCalculo, apresentarPedido, apresentarListaPedidos, resumoTexto
  respostas.ts        # json(status, corpo), erroInterno(e), statusHttpDoCodigo(codigo)
  servico.ts          # orquestra: contexto(), revisar(), criar(), listar() — recebe deps (db, provedor, notificador, agora)
src/app/api/bot/
  contexto/route.ts
  pedidos/route.ts            # GET + POST
  pedidos/revisar/route.ts
tests/bot/{entrada,apresentacao,servico,rotas}.test.ts
```

## Decisões
- **Três camadas:** `route.ts` (HTTP) → `servico.ts` (orquestração com dependências injetadas) → domínio (002/003). Os testes de serviço usam `criarDbTeste()` + provedor mock; os testes de rota chamam `GET`/`POST` diretamente com `new Request(...)`, injetando dependências por um `vi.mock('@/lib/bot/deps')`.
- **`deps.ts`:** `getDepsBot()` devolve `{ db: getDb(), provedor: getProvedorPagamento(), notificador: getNotificador(), agora: () => new Date() }`. É o único ponto de wiring.
- **Leitura tolerante (`entrada.ts`):**
  - `itens: z.preprocess(v => typeof v === 'string' ? JSON.parse(v) : v, z.array(...))`, com `try/catch` virando erro de formato;
  - item: `z.preprocess` que mapeia os aliases e depois `z.object({ itemId: z.coerce.number().int(), quantidade: z.coerce.number().int(), observacao: z.string().nullish() })`.
- **Mapeamento de código → HTTP:**

  | Código | HTTP |
  |---|---|
  | `ITENS_INVALIDOS`, `ENTREGA_INVALIDA` | 422 |
  | `LOJA_FECHADA` | 409 |
  | `FORMATO_INVALIDO` | 400 |
  | `PIX_INDISPONIVEL` | 502 |

- **`resumoTexto`:** usa a formatação do WhatsApp (`*negrito*`). O agente pode colar o texto direto.
- **Datas:** saem em ISO UTC. O LLM recebe também `validadeTexto` ("30 minutos") para não fazer conta de fuso.
- **Ordem no POST /pedidos:** `criarPedido` (deduplica) → se ok, `garantirCobranca` dentro de try/catch → se falhar, 502 com o número do pedido.

## Riscos
- `vi.mock` de módulo com Next 16 + Vitest 5: se der atrito, as rotas exportam também uma fábrica `criarHandlers(deps)`, e o teste usa a fábrica.
