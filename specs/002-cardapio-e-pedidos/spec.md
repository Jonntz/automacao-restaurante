# 002 — Cardápio e Pedidos (domínio)

## Objetivo
Implementar as regras de negócio de cardápio e pedido, sem HTTP: consultar o cardápio, calcular um pedido com segurança, criar pedido sem duplicar, controlar o ciclo de status e notificar o cliente nas mudanças. Esta é a parte mais crítica da PoC, porque é aqui que a Constituição I e II é garantida.

## Histórias
- **H1.** Como cliente, quero ver só os itens disponíveis, com preço correto, organizados por categoria.
- **H2.** Como restaurante, quero que nenhum pedido tenha preço diferente do cardápio, não importa o que a IA diga.
- **H3.** Como cliente, quero que meu "sim, confirmo" repetido não gere dois pedidos.
- **H4.** Como restaurante, quero mover o pedido pelas etapas sem pular passos inválidos, e que o cliente seja avisado a cada etapa.

## Requisitos funcionais

### Cardápio
- **PED-RF-01** — `obterCardapio(db, { somenteDisponiveis })` devolve as categorias em `ordem`, cada uma com seus itens ordenados por `id`. Categorias sem itens visíveis são omitidas.
- **PED-RF-02** — `formatarCardapioTexto(cardapio)` gera um texto compacto para o LLM, uma linha por item: `[id 3] X-Bacon — R$ 31,90 — descrição`, agrupado por categoria com título.
- **PED-RF-03** — `obterConfiguracao(db)` devolve a configuração da loja (linha `id = 1`).

### Cálculo
- **PED-RF-04** — `calcularPedido(db, entrada)` recebe `{ itens: [{itemId, quantidade, observacao?}], tipoEntrega, endereco? }` e devolve **ou** `{ ok: true, linhas, subtotal, taxa, total }` **ou** `{ ok: false, codigo, erros: string[] }`. Erros não viram exceção.
- **PED-RF-05** — O preço vem **sempre** do banco; campos de preço ou total na entrada são ignorados (Constituição I).
- **PED-RF-06** — Validações, que acumulam todos os erros encontrados:
  - item inexistente: `"O item de id 99 não existe no cardápio. Use apenas IDs do cardápio."`;
  - item indisponível: `"X-Salada (id 2) está indisponível no momento."`;
  - quantidade não inteira ou fora de `1..20`;
  - lista de itens vazia;
  - `tipoEntrega` fora de `entrega|retirada`;
  - `entrega` sem endereço, ou com endereço de menos de 10 caracteres;
  - `retirada` quando `aceita_retirada = false`.
- **PED-RF-07** — Loja fechada (`loja_aberta = false`) devolve `codigo: "LOJA_FECHADA"` com o horário na mensagem, e nenhuma outra validação roda.
- **PED-RF-08** — Linhas com o mesmo `itemId` e a mesma observação (após trim; vazio = sem observação) são agregadas somando as quantidades. O limite de 20 vale para a soma.
- **PED-RF-09** — Taxa de entrega = `taxa_entrega_centavos` se `entrega`, 0 se `retirada`. Total = subtotal + taxa.

### Criação
- **PED-RF-10** — `criarPedido(db, entrada, { agora })` recebe `{ telefone, nomeCliente?, itens, tipoEntrega, endereco?, observacoes? }`:
  - roda o `calcularPedido` e devolve os erros dele, sem gravar nada, se houver;
  - faz upsert do cliente por telefone: atualiza o nome se veio, e o `ultimo_endereco` se é entrega;
  - grava o pedido em `aguardando_pagamento` com itens em snapshot (nome e preço) numa **transação**.
- **PED-RF-11** — O canal é derivado do telefone: prefixo `teste:` vira `teste`, qualquer outro vira `whatsapp`.
- **PED-RF-12** — Idempotência: a `assinatura` é um hash estável de itens agregados (ordenados por id e observação) + `tipoEntrega` + endereço normalizado. Se o cliente já tem um pedido com a mesma assinatura em `aguardando_pagamento`, criado há ≤ 5 min, a função devolve esse pedido com `duplicado: true` e não cria outro.
- **PED-RF-13** — `consultarPedidosDoCliente(db, telefone, { limite = 5 })` devolve os pedidos mais recentes primeiro, com itens e o último pagamento.

### Status
- **PED-RF-14** — Transições permitidas (qualquer outra é inválida):

  | De | Para |
  |---|---|
  | `aguardando_pagamento` | `pago`*, `cancelado` |
  | `pago` | `em_preparo`, `cancelado` |
  | `em_preparo` | `saiu_para_entrega` (só entrega), `pronto_para_retirada` (só retirada) |
  | `saiu_para_entrega` | `entregue` |
  | `pronto_para_retirada` | `entregue` |
  | `entregue`, `cancelado` | — (finais) |

  \* A transição para `pago` é exclusiva da origem `pagamento` (feature 003). O admin nunca marca como pago à mão.
- **PED-RF-15** — `proximoStatus(pedido)` devolve o próximo passo "feliz" para o admin, ou `null`:
  - `pago` → `em_preparo`;
  - `em_preparo` → `saiu_para_entrega` ou `pronto_para_retirada`, conforme o tipo;
  - `saiu_para_entrega` e `pronto_para_retirada` → `entregue`;
  - `aguardando_pagamento` → `null`, porque o avanço depende do pagamento.
- **PED-RF-16** — `alterarStatus(db, pedidoId, novoStatus, { origem: 'admin' | 'pagamento', notificador, agora })`:
  - valida a transição e grava `status` + `atualizado_em`;
  - depois do commit, monta o texto com `mensagemDeStatus` (PED-RF-18) e chama `notificador.notificar({ telefone, canal }, mensagem)`;
  - devolve `{ ok: false, erro }` para transição inválida ou pedido inexistente.
- **PED-RF-17** — `rotuloStatus(status)` devolve o texto em PT-BR (ex.: `"Aguardando pagamento"`), usado no admin e para o LLM.

### Notificações
- **PED-RF-18** — `mensagemDeStatus(pedido, status, config)` devolve o texto ao cliente para `pago`, `em_preparo`, `saiu_para_entrega`, `pronto_para_retirada`, `entregue` e `cancelado`, sempre com o número `#0012`:
  - `saiu_para_entrega` inclui o tempo estimado;
  - `pronto_para_retirada` inclui o endereço de retirada.
- **PED-RF-19** — `criarNotificadorN8n({ n8nUrl, segredo, fetch })` implementa `Notificador` (`notificar(destino: { telefone, canal }, mensagem)`):
  - faz `POST {n8nUrl}/webhook/notificar-cliente` com `{ telefone, mensagem }` e header `x-webhook-secret`, com timeout de 5 s;
  - **nunca lança erro**, só registra no log;
  - **ignora** clientes do canal `teste`.
- **PED-RF-20** — Existe o `notificadorNulo`, que não faz nada, para testes e para quando `N8N_URL` não está configurada.

## Requisitos não funcionais
- **PED-RNF-01** — Todas as funções recebem `db` e dependências (`agora`, `notificador`) por parâmetro, o que as torna testáveis sem mocks globais.
- **PED-RNF-02** — Criar o pedido e seus itens é atômico: em caso de erro, nada fica gravado.

## Critérios de aceite
- **CA-01** — Dado o cardápio seed com X-Salada indisponível, quando chamo `obterCardapio({somenteDisponiveis: true})`, então X-Salada não aparece e as categorias vêm na ordem 1–4.
- **CA-02** — Dada a entrada `[{itemId: 1, quantidade: 2, precoUnitario: 1}]` (X-Burguer 25,90) para `retirada`, quando calculo, então subtotal = 5180, taxa = 0, total = 5180.
- **CA-03** — Dados X-Bacon ×1 + Coca ×2 para `entrega` com endereço válido, quando calculo, então subtotal = 3190 + 1300 = 4490, taxa = 500, total = 4990.
- **CA-04** — Dados item 99 e item indisponível na mesma entrada, quando calculo, então recebo `ok: false` com **as duas** mensagens.
- **CA-05** — Dada a loja fechada, quando calculo, então `codigo = LOJA_FECHADA` e a mensagem contém o horário.
- **CA-06** — Dado `entrega` sem endereço, quando calculo, então o erro pede o endereço.
- **CA-07** — Dado um pedido criado há 2 min, quando crio de novo com os mesmos itens, então recebo o mesmo id com `duplicado: true`. Com 6 min de diferença, um novo pedido é criado.
- **CA-08** — Dado um telefone novo, quando crio o pedido com `nomeCliente`, então o cliente é criado com esse nome. Num segundo pedido com entrega, o `ultimo_endereco` é atualizado.
- **CA-09** — Dado `em_preparo` numa retirada, quando tento `saiu_para_entrega`, então a transição é recusada. `pronto_para_retirada` é aceita.
- **CA-10** — Dado um pedido em `aguardando_pagamento`, quando o admin tenta `pago`, então a mudança é recusada. Com a origem `pagamento`, é aceita.
- **CA-11** — Dada uma transição válida, quando `alterarStatus` conclui, então o notificador é chamado uma vez, com o telefone e o canal do cliente e a mensagem do novo status. Numa transição inválida, o notificador não é chamado.
- **CA-12** — Dado um cliente `teste:abc`, quando o notificador HTTP é chamado, então nenhum `fetch` acontece.
- **CA-13** — Dado que o n8n responde 500 ou estoura o tempo, quando o notificador HTTP é chamado, então a função conclui sem lançar erro.

## Casos de borda
- Quantidade `"2"` (string) é aceita, porque a coerção acontece na borda HTTP (feature 004). Aqui, o domínio recebe número.
- Observação com espaços extras é normalizada (`trim`); string vazia vira `null`.
- Duas linhas do mesmo item com observações diferentes ("sem cebola" e "com cebola") **não** são agregadas.

## Fora de escopo
Cupons, adicionais/variações de item, agendamento, cancelamento pelo cliente, histórico de mudanças de status.

## Histórico
- 2026-10-16 — versão inicial.
- 2026-10-16 — A interface `Notificador` passou a receber `({ telefone, canal }, mensagem)`. Quem monta a mensagem é o `alterarStatus`, que tem acesso à configuração da loja. O notificador só entrega.
