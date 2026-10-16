# 005 — Plano técnico

## Arquivos
```
src/lib/auth/
  sessao.ts           # criarTokenSessao, verificarTokenSessao (jose), NOME_COOKIE, DURACAO
  credenciais.ts      # validarCredenciais(email, senha) — timing-safe via compararSegredo
  exigir-sessao.ts    # exigirSessao(): lê cookies() e lança/redireciona; usado em actions e /api/admin
src/proxy.ts          # Next 16: export function proxy(request) + config.matcher
src/app/login/{page.tsx, actions.ts}
src/app/admin/
  layout.tsx          # header: nome da loja, nav, SwitchLoja, Sair
  page.tsx            # redirect('/admin/pedidos')
  acoes-loja.ts       # alternarLoja (server action)
  pedidos/
    page.tsx          # server: carrega estado inicial e renderiza <Kanban inicial=…/>
    kanban.tsx        # client: polling, colunas, destaque, som
    card-pedido.tsx   # client
    detalhes-pedido.tsx  # Sheet
    acoes.ts          # server actions: avancarPedido, cancelarPedido, simularPagamentoPedido, verificarPagamentoPedido
  cardapio/
    page.tsx          # server
    formulario-item.tsx, formulario-categoria.tsx  # client (Dialog)
    acoes.ts          # server actions: salvarCategoria, excluirCategoria, salvarItem, excluirItem, alternarDisponibilidade
src/app/api/admin/pedidos/route.ts
src/lib/admin/
  painel.ts           # listarPedidosPainel(db, agora) → colunas; acoesDisponiveis(pedido, provedor)
  cardapio.ts         # salvarItem, salvarCategoria, excluir*, alternarDisponibilidade (domínio puro, com validação zod)
  tempo.ts            # inicioDoDiaSaoPaulo(agora), tempoRelativo(data, agora)
tests/admin/{sessao,credenciais,painel,cardapio,tempo}.test.ts
```

## Decisões
- **Sessão:** um payload `{ sub: email }` é suficiente, porque só existe um admin. O `jose` funciona tanto no runtime do proxy quanto no do Node.
- **Proxy (Next 16):** o arquivo `src/proxy.ts` exporta `proxy()`. O matcher é `['/admin/:path*', '/api/admin/:path*']`, e o proxy só verifica o JWT, sem acessar o banco.
- **Polling:** o client usa `setInterval(5000)` + `fetch('/api/admin/pedidos', { cache: 'no-store' })`.
  - Pausa quando a aba está oculta (`document.visibilityState`).
  - Depois de cada ação, chama `recarregar()` na hora.
  - "Novo pago" = id que entrou na coluna `pago` e não estava no snapshot anterior; o snapshot inicial não dispara som.
- **Bipe:** `AudioContext` + `OscillatorNode` (880 Hz, 150 ms ×2), criado só depois do clique em "Ativar som". A escolha fica num `localStorage` protegido por try/catch.
- **Server actions:** cada uma faz `exigirSessao()` → valida a entrada com zod → chama o domínio (002/003/`admin/cardapio.ts`) com as dependências reais → `revalidatePath` quando aplicável → devolve `{ ok, mensagem }` para o toast.
- **"Hoje" no fuso de SP:** `inicioDoDiaSaoPaulo` usa `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })` para obter a data local e converte para UTC (o Brasil não tem horário de verão desde 2019; offset fixo de −03:00 documentado).
- **UI:** componentes shadcn (Card, Badge, Button, Sheet, Dialog, AlertDialog, Switch, Input, Select, Textarea, Sonner) e ícones `lucide-react`.

## Riscos
- O nome e a assinatura do `proxy.ts` podem variar entre versões do Next 16. Confirmar no guia de upgrade da versão instalada; o fallback é `middleware.ts`.
