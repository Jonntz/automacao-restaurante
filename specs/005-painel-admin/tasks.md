# 005 — Tarefas

## Acesso
- [x] T005.01 [P] TESTE: criar/verificar token (válido, expirado, outra chave, lixo) — ADM-RF-01, CA-03
      Arquivo: tests/admin/sessao.test.ts · Depende de: 001 · Pronto quando: falha
- [x] T005.02 IMPL: src/lib/auth/sessao.ts + env.admin() — ADM-RF-01
      Arquivo: src/lib/auth/sessao.ts · Depende de: T005.01 · Pronto quando: T005.01 passa
- [x] T005.03 [P] TESTE: validarCredenciais (certo, e-mail errado, senha errada, vazios) — ADM-RF-01, CA-02
      Arquivo: tests/admin/credenciais.test.ts · Depende de: 003 (seguranca.ts) · Pronto quando: falha
- [x] T005.04 IMPL: src/lib/auth/credenciais.ts + exigir-sessao.ts — ADM-RF-01, ADM-RF-03
      Arquivo: src/lib/auth/* · Depende de: T005.03 · Pronto quando: T005.03 passa
- [x] T005.05 IMPL: proxy.ts (matcher, redirect com `?de=`, 401 JSON para /api/admin) — ADM-RF-02
      Arquivo: src/proxy.ts · Depende de: T005.02 · Pronto quando: CA-01 verificado manualmente
- [x] T005.06 IMPL: página /login + action (cookie, redirect, erro genérico) + Sair — ADM-RF-01, ADM-RF-04
      Arquivo: src/app/login/* · Depende de: T005.04 · Pronto quando: CA-02 verificado manualmente

## Painel de pedidos
- [x] T005.07 [P] TESTE: inicioDoDiaSaoPaulo (23h30 de SP = dia correto) e tempoRelativo ("agora", "há 5 min", "há 2 h") — ADM-RF-05, ADM-RF-09
      Arquivo: tests/admin/tempo.test.ts · Depende de: — · Pronto quando: falha
- [x] T005.08 IMPL: src/lib/admin/tempo.ts — ADM-RF-05, ADM-RF-09
      Arquivo: src/lib/admin/tempo.ts · Depende de: T005.07 · Pronto quando: T005.07 passa
- [x] T005.09 TESTE: listarPedidosPainel (agrupa nas 5 colunas, ordem por antiguidade, concluídos só de hoje, status efetivo do pagamento, alerta pago após cancelamento) + acoesDisponiveis — ADM-RF-05, ADM-RF-06, ADM-RF-10, ADM-RF-12
      Arquivo: tests/admin/painel.test.ts · Depende de: T005.08, 003 · Pronto quando: falha
- [x] T005.10 IMPL: src/lib/admin/painel.ts — ADM-RF-05, ADM-RF-06, ADM-RF-10, ADM-RF-12
      Arquivo: src/lib/admin/painel.ts · Depende de: T005.09 · Pronto quando: T005.09 passa
- [x] T005.11 IMPL: GET /api/admin/pedidos (exigirSessao + listarPedidosPainel) — ADM-RF-05, ADM-RF-03
      Arquivo: src/app/api/admin/pedidos/route.ts · Depende de: T005.10, T005.04 · Pronto quando: responde 200 com sessão e 401 sem
- [x] T005.12 IMPL: server actions de pedido (avançar, cancelar, simular, verificar) — ADM-RF-10, CA-10
      Arquivo: src/app/admin/pedidos/acoes.ts · Depende de: T005.04, 002, 003 · Pronto quando: typecheck passa
- [x] T005.13 IMPL: layout /admin (nav, nome da loja, switch da loja, Sair) + redirect da raiz — ADM-RF-18, ADM-RF-19
      Arquivo: src/app/admin/layout.tsx, page.tsx, acoes-loja.ts · Depende de: T005.06 · Pronto quando: renderiza
- [x] T005.14 IMPL: Kanban client (polling 5 s, pausa com aba oculta, colunas, contadores, "atualizado há") — ADM-RF-06, ADM-RF-07
      Arquivo: src/app/admin/pedidos/{page,kanban}.tsx · Depende de: T005.11 · Pronto quando: CA-04 verificado manualmente
- [x] T005.15 IMPL: CardPedido (dados, badge TESTE, ações com toast, AlertDialog de cancelar) — ADM-RF-09, ADM-RF-10, ADM-RF-12
      Arquivo: src/app/admin/pedidos/card-pedido.tsx · Depende de: T005.12, T005.14 · Pronto quando: CA-05/CA-06 verificados manualmente
- [x] T005.16 IMPL: destaque de pedido novo pago + botão "Ativar som" + bipe Web Audio — ADM-RF-08
      Arquivo: src/app/admin/pedidos/kanban.tsx · Depende de: T005.14 · Pronto quando: CA-05 (som) verificado
- [x] T005.17 IMPL: Sheet de detalhes (copiar copia-e-cola) — ADM-RF-11
      Arquivo: src/app/admin/pedidos/detalhes-pedido.tsx · Depende de: T005.15 · Pronto quando: abre com todos os campos

## Cardápio
- [x] T005.18 TESTE: domínio do cardápio admin (salvarItem com preço "7,50" → 750; preço inválido/zero; nome duplicado na categoria; excluir categoria com itens → erro; excluir item preserva o snapshot do pedido; alternarDisponibilidade) — ADM-RF-14…17, CA-07
      Arquivo: tests/admin/cardapio.test.ts · Depende de: 002 · Pronto quando: falha
- [x] T005.19 IMPL: src/lib/admin/cardapio.ts — ADM-RF-14…17
      Arquivo: src/lib/admin/cardapio.ts · Depende de: T005.18 · Pronto quando: T005.18 passa
- [x] T005.20 IMPL: página /admin/cardapio + formulários (Dialog) + actions + switch otimista — ADM-RF-13…17
      Arquivo: src/app/admin/cardapio/* · Depende de: T005.19 · Pronto quando: CA-07/CA-08 verificados manualmente

## Fechamento
- [x] T005.22 IMPL: scripts/e2e-admin.mjs + `pnpm e2e:admin` (playwright-core + Chrome do sistema; telefone `teste:`; limpa o item criado; screenshots em `.e2e/`) — ADM-RNF-04
      Arquivo: scripts/e2e-admin.mjs, package.json, .gitignore · Depende de: T005.20 · Pronto quando: roda verde contra `pnpm dev`
- [x] T005.21 VERIF: roteiro manual CA-01…CA-10 (login, kanban, simular, avançar, cardápio, loja fechada, duplo clique) + responsividade em 768px e 390px; testes verdes; ROADMAP; commit `feat(005)` — ADM-RNF-01…03
      Depende de: todas · Pronto quando: roteiro registrado em docs/verificacao-e2e.md
