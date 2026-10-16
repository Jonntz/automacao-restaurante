# 002 — Tarefas

## Base
- [x] T002.01 SETUP: fixtures de teste (seedDemo + helpers `desativarItem`, `fecharLoja`, `semRetirada`) — PED-RNF-01
      Arquivo: tests/helpers/fixtures.ts · Depende de: 001 · Pronto quando: importável nos testes
- [x] T002.02 IMPL: tipos do domínio (EntradaItem, ResultadoCalculo, StatusPedido, Notificador…) — PED-RNF-01
      Arquivo: src/lib/pedidos/tipos.ts · Depende de: — · Pronto quando: typecheck passa

## Cardápio
- [x] T002.03 TESTE: obterCardapio ordena categorias, filtra indisponíveis e omite categoria vazia; obterConfiguracao — PED-RF-01, PED-RF-03, CA-01
      Arquivo: tests/pedidos/cardapio.test.ts · Depende de: T002.01 · Pronto quando: falha
- [x] T002.04 IMPL: src/lib/cardapio/consultar.ts — PED-RF-01, PED-RF-03
      Arquivo: src/lib/cardapio/consultar.ts · Depende de: T002.03 · Pronto quando: T002.03 passa
- [x] T002.05 [P] TESTE: formatarCardapioTexto gera `[id N] Nome — R$ x — desc` agrupado por categoria — PED-RF-02
      Arquivo: tests/pedidos/cardapio.test.ts · Depende de: T002.04 · Pronto quando: falha
- [x] T002.06 IMPL: src/lib/cardapio/formatar.ts — PED-RF-02
      Arquivo: src/lib/cardapio/formatar.ts · Depende de: T002.05 · Pronto quando: T002.05 passa

## Cálculo
- [x] T002.07 TESTE: cálculo feliz (retirada e entrega), ignorando preço enviado — PED-RF-04, PED-RF-05, PED-RF-09, CA-02, CA-03
      Arquivo: tests/pedidos/calcular.test.ts · Depende de: T002.01 · Pronto quando: falha
- [x] T002.08 TESTE: validações acumuladas (inexistente + indisponível, qtd inválida, lista vazia, tipo inválido, entrega sem endereço, retirada desabilitada) — PED-RF-06, CA-04, CA-06
      Arquivo: tests/pedidos/calcular.test.ts · Depende de: T002.07 · Pronto quando: falha
- [x] T002.09 TESTE: loja fechada curto-circuita com horário — PED-RF-07, CA-05
      Arquivo: tests/pedidos/calcular.test.ts · Depende de: T002.07 · Pronto quando: falha
- [x] T002.10 TESTE: agregação de linhas iguais; observações diferentes não agregam; limite 20 na soma — PED-RF-08
      Arquivo: tests/pedidos/calcular.test.ts · Depende de: T002.07 · Pronto quando: falha
- [x] T002.11 IMPL: src/lib/pedidos/calcular.ts — PED-RF-04…09
      Arquivo: src/lib/pedidos/calcular.ts · Depende de: T002.07–T002.10 · Pronto quando: T002.07–T002.10 passam

## Criação e consulta
- [x] T002.12 [P] TESTE: assinaturaPedido estável (ordem das linhas e espaços do endereço não mudam o hash; itens diferentes mudam) — PED-RF-12
      Arquivo: tests/pedidos/criar.test.ts · Depende de: T002.02 · Pronto quando: falha
- [x] T002.13 IMPL: src/lib/pedidos/assinatura.ts — PED-RF-12
      Arquivo: src/lib/pedidos/assinatura.ts · Depende de: T002.12 · Pronto quando: T002.12 passa
- [x] T002.14 TESTE: criarPedido grava pedido + itens snapshot + totais; erros de cálculo não gravam nada — PED-RF-10, PED-RNF-02
      Arquivo: tests/pedidos/criar.test.ts · Depende de: T002.11, T002.13 · Pronto quando: falha
- [x] T002.15 TESTE: upsert de cliente (nome, ultimo_endereco) e canal derivado do telefone — PED-RF-10, PED-RF-11, CA-08
      Arquivo: tests/pedidos/criar.test.ts · Depende de: T002.14 · Pronto quando: falha
- [x] T002.16 TESTE: deduplicação 2 min → mesmo pedido `duplicado: true`; 6 min → novo; status ≠ aguardando → novo — PED-RF-12, CA-07
      Arquivo: tests/pedidos/criar.test.ts · Depende de: T002.14 · Pronto quando: falha
- [x] T002.17 IMPL: src/lib/pedidos/criar.ts (transação, upsert, dedup, canal) — PED-RF-10…12
      Arquivo: src/lib/pedidos/criar.ts · Depende de: T002.14–T002.16 · Pronto quando: T002.14–T002.16 passam
- [x] T002.18 TESTE: consultarPedidosDoCliente (ordem desc, limite, itens e último pagamento) — PED-RF-13
      Arquivo: tests/pedidos/criar.test.ts · Depende de: T002.17 · Pronto quando: falha
- [x] T002.19 IMPL: src/lib/pedidos/consultar.ts — PED-RF-13
      Arquivo: src/lib/pedidos/consultar.ts · Depende de: T002.18 · Pronto quando: T002.18 passa

## Status
- [x] T002.20 TESTE: matriz de transições (todas as válidas e uma amostra das inválidas, incluindo entrega × retirada e o bloqueio de `pago` pelo admin) + proximoStatus + rotuloStatus — PED-RF-14, PED-RF-15, PED-RF-17, CA-09, CA-10
      Arquivo: tests/pedidos/status.test.ts · Depende de: T002.02 · Pronto quando: falha
- [x] T002.21 TESTE: alterarStatus grava, notifica uma vez em caso de sucesso, não notifica em erro, recusa a corrida (status mudou entre leitura e escrita) — PED-RF-16, CA-11
      Arquivo: tests/pedidos/status.test.ts · Depende de: T002.17 · Pronto quando: falha
- [x] T002.22 IMPL: src/lib/pedidos/status.ts — PED-RF-14…17
      Arquivo: src/lib/pedidos/status.ts · Depende de: T002.20, T002.21 · Pronto quando: T002.20–T002.21 passam

## Notificações
- [x] T002.23 [P] TESTE: mensagemDeStatus para os 6 status (número do pedido, tempo estimado, endereço de retirada) — PED-RF-18
      Arquivo: tests/notificacoes/mensagens.test.ts · Depende de: T002.02 · Pronto quando: falha
- [x] T002.24 IMPL: src/lib/notificacoes/mensagens.ts — PED-RF-18
      Arquivo: src/lib/notificacoes/mensagens.ts · Depende de: T002.23 · Pronto quando: T002.23 passa
- [x] T002.25 TESTE: notificador HTTP envia o POST correto (URL, header, corpo), ignora o canal teste e engole 500/timeout — PED-RF-19, PED-RF-20, CA-12, CA-13
      Arquivo: tests/notificacoes/notificador.test.ts · Depende de: T002.24 · Pronto quando: falha
- [x] T002.26 IMPL: src/lib/notificacoes/notificador.ts (+ getNotificador) — PED-RF-19, PED-RF-20
      Arquivo: src/lib/notificacoes/notificador.ts · Depende de: T002.25 · Pronto quando: T002.25 passa

## Fechamento
- [x] T002.27 VERIF: CA-01…CA-13 cobertos por testes verdes; typecheck/lint ok; ROADMAP; commit `feat(002)`
      Depende de: todas · Pronto quando: tudo verde
