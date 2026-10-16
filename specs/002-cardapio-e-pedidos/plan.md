# 002 — Plano técnico

## Arquivos
```
src/lib/cardapio/
  consultar.ts            # obterCardapio, obterConfiguracao
  formatar.ts             # formatarCardapioTexto
src/lib/pedidos/
  tipos.ts                # EntradaPedido, LinhaCalculada, ResultadoCalculo, Notificador, StatusPedido…
  calcular.ts             # calcularPedido (+ agregarLinhas)
  assinatura.ts           # assinaturaPedido (sha256 hex de JSON canônico)
  criar.ts                # criarPedido, canalDoTelefone
  consultar.ts            # consultarPedidosDoCliente, obterPedidoCompleto
  status.ts               # TRANSICOES, podeTransicionar, proximoStatus, alterarStatus, rotuloStatus
src/lib/notificacoes/
  mensagens.ts            # mensagemDeStatus
  notificador.ts          # Notificador, notificadorNulo, criarNotificadorN8n, getNotificador()
tests/pedidos/{cardapio,calcular,criar,status}.test.ts
tests/notificacoes/{mensagens,notificador}.test.ts
tests/helpers/fixtures.ts  # seed mínimo + helpers (desativarItem, fecharLoja…)
```

## Tipos principais
```ts
type EntradaItem = { itemId: number; quantidade: number; observacao?: string | null };
type EntradaCalculo = { itens: EntradaItem[]; tipoEntrega: 'entrega' | 'retirada'; endereco?: string | null };
type LinhaCalculada = { itemId: number; nome: string; precoUnitario: number; quantidade: number; observacao: string | null; subtotal: number };
type ResultadoCalculo =
  | { ok: true; linhas: LinhaCalculada[]; subtotal: number; taxa: number; total: number }
  | { ok: false; codigo: 'LOJA_FECHADA' | 'ITENS_INVALIDOS' | 'ENTREGA_INVALIDA'; erros: string[] };
interface Notificador { notificar(pedido: PedidoComCliente, status: StatusPedido): Promise<void> }
```

## Decisões
- **Cálculo:**
  - carrega todos os itens referenciados numa única query (`inArray`);
  - agrega as linhas antes de validar os limites;
  - acumula todos os erros e devolve tudo de uma vez, para o LLM corrigir numa só rodada.
- **Assinatura:**
  - JSON de `{tipoEntrega, endereco (lowercase, espaços colapsados), linhas: [[itemId, qtd, obs]]}` ordenado;
  - hash `sha256` (`node:crypto`), coluna `pedidos.assinatura`;
  - a busca da duplicata usa o índice `(cliente_id, status, criado_em)`.
- **Transação:** `db.transaction(async tx => …)` do Drizzle/libSQL. O upsert do cliente usa `onConflictDoUpdate` por telefone.
- **`alterarStatus`:**
  - lê o pedido, valida e faz um `update … where id = ? and status = ?` (lock otimista contra corrida dupla de cliques);
  - se nenhuma linha mudou, devolve um erro de concorrência;
  - notifica depois do update, com `await`. O notificador já engole os erros.
- **Notificador HTTP:** usa `AbortSignal.timeout(5000)`, `fetch` injetável e `console.warn` para falhas (nunca loga o segredo). `getNotificador()` devolve o HTTP se `N8N_URL` e `N8N_WEBHOOK_SECRET` existirem; senão, o nulo.
- **Mensagens:** curtas, com um emoji no início. Ficam num `Record<StatusNotificavel, (ctx) => string>`.

## Riscos
- **Transações interativas do libSQL em `:memory:`:** caso falhem, usar `db.batch()` com os inserts encadeados por `returning`. Validar no T002.17.
