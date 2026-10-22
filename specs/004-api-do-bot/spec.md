# 004 — API do Bot

## Objetivo
Expor as regras de 002 e 003 em HTTP para o agente do n8n, com respostas **pensadas para um LLM**: dados prontos para mostrar ao cliente e erros em PT-BR que dizem como corrigir. O contrato detalhado está em [contracts/api-bot.md](contracts/api-bot.md).

## Histórias
- **H1.** Como agente de IA, quero receber numa só chamada tudo o que preciso para conversar: loja, cardápio, cliente e pedidos recentes.
- **H2.** Como agente, quero revisar um pedido antes de criar, para mostrar o total oficial ao cliente.
- **H3.** Como agente, quero criar o pedido e já receber o Pix, e consultar o status quando o cliente perguntar.
- **H4.** Como restaurante, quero que só o meu n8n consiga usar essa API.

## Requisitos funcionais
- **BOT-RF-01** — Todas as rotas `/api/bot/*` exigem o header `x-api-key` igual a `BOT_API_KEY`, com comparação timing-safe. Sem ele, ou com valor errado, a resposta é **401** `{ ok: false, erro: "Não autorizado" }`. Se a `BOT_API_KEY` não estiver configurada no servidor, a resposta é **503** `{ ok: false, erro: "API do bot não configurada" }`, com um log explicando o motivo.
- **BOT-RF-02** — `GET /api/bot/contexto?telefone=` devolve:
  - `restaurante`: nome, `lojaAberta`, horário, tempo estimado, taxa formatada e em centavos, `aceitaRetirada`, endereço de retirada;
  - `cardapioTexto` (PED-RF-02, só itens disponíveis);
  - `cliente`: `{ nome, ultimoEndereco }`, ou `null`;
  - `pedidosRecentes`: os 3 últimos, com número, status em texto e total formatado.

  Sem `telefone`, a resposta é **400**.
- **BOT-RF-03** — `POST /api/bot/pedidos/revisar` com `{ itens, tipoEntrega, endereco? }`:
  - em caso de sucesso, devolve **200** `{ ok: true, linhas, subtotal, taxaEntrega, total, resumoTexto }`, com valores formatados e em centavos;
  - em caso de erro de validação, devolve **422** `{ ok: false, codigo, erros: [...] }`.
- **BOT-RF-04** — `POST /api/bot/pedidos` com `{ telefone, nomeCliente?, itens, tipoEntrega, endereco?, observacoes? }`:
  - roda `criarPedido` e depois `garantirCobranca`;
  - pedido novo: **201** `{ ok: true, duplicado: false, pedido: {...}, pix: { copiaECola, expiraEm, validadeTexto } }`;
  - deduplicado: **200**, com `duplicado: true` e o **mesmo** Pix;
  - erro de validação: **422**; loja fechada: **409** (`codigo: LOJA_FECHADA`).
- **BOT-RF-05** — Se o pedido é criado mas a cobrança falha, a resposta é **502** `{ ok: false, codigo: "PIX_INDISPONIVEL", erros: ["Pedido #0012 registrado, mas não consegui gerar o Pix agora. Tente confirmar de novo em instantes."], pedido }`. Chamar de novo, com os mesmos dados, cai na deduplicação, e o `garantirCobranca` tenta gerar o Pix outra vez.
- **BOT-RF-06** — `GET /api/bot/pedidos?telefone=`:
  - primeiro reconcilia os pendentes do cliente (PAG-RF-11), sem deixar que uma falha nessa etapa derrube a resposta;
  - depois devolve até 5 pedidos, cada um com número, status, status em texto, total, resumo dos itens e data. Para os que estão em `aguardando_pagamento`, inclui `pix: { copiaECola, expirado }`.
- **BOT-RF-07** — Leitura tolerante da entrada, porque o LLM erra formato (ver [ADR-01](../arquitetura.md) e a nota sobre `$fromAI`):
  - `itens` pode vir como array **ou** como string JSON;
  - `itemId` e `quantidade` podem vir como string numérica;
  - aceita `item_id`, `id` e `itemId`; `qtd` e `quantidade`; `obs` e `observacao`;
  - `tipoEntrega` aceita `tipo_entrega` e maiúsculas;
  - campos desconhecidos (como `preco`) são ignorados;
  - `quantidade` ausente vale 1;
  - um único objeto em `itens`, fora de um array, é tratado como lista de um item.
- **BOT-RF-08** — Corpo inválido (JSON quebrado ou campos obrigatórios ausentes) devolve **400** com `erros` que dizem o formato esperado, com exemplo.
- **BOT-RF-09** — Erro inesperado devolve **500** `{ ok: false, erro: "Erro interno, tente novamente." }`, sem stack trace. O detalhe vai só para o log do servidor.
- **BOT-RF-10** — O telefone sempre vem do chamador (o workflow) e nunca é inferido. O canal é derivado do telefone (PED-RF-11).

## Requisitos não funcionais
- **BOT-RNF-01** — Cada rota é uma casca fina: faz parse, chama o domínio e formata. A lógica de formatação fica em `src/lib/bot/apresentacao.ts` e é testada.
- **BOT-RNF-02** — Respostas compactas: o `contexto` com o cardápio demo tem menos de 4 KB, para poupar tokens.

## Critérios de aceite
> Os valores e IDs abaixo vêm do **cardápio de teste fixo** (`tests/helpers/cardapio-teste.ts`), não do seed demo (MRC-RF-08).

- **CA-01** — Dado um request sem `x-api-key`, quando chamo qualquer rota `/api/bot/*`, então recebo 401.
- **CA-02** — Dado um telefone novo, quando chamo `contexto`, então `cliente = null`, `cardapioTexto` contém `[id 1] X-Burguer — R$ 25,90` e não contém itens indisponíveis.
- **CA-03** — Dado `itens` como **string** `"[{\"item_id\":\"1\",\"qtd\":\"2\"}]"`, quando chamo `revisar`, então recebo 200 com total 5180 (retirada).
- **CA-04** — Dado um item inexistente, quando chamo `revisar`, então recebo 422 com a mensagem pedindo IDs do cardápio.
- **CA-05** — Dado um pedido válido com o provedor mock, quando chamo `POST /pedidos`, então recebo 201 com `pix.copiaECola` começando por `000201`. Repetindo a chamada, recebo 200 `duplicado: true` com o mesmo `copiaECola`.
- **CA-06** — Dado um provedor que falha na criação, quando chamo `POST /pedidos`, então recebo 502 `PIX_INDISPONIVEL`. Depois que o provedor volta, a mesma chamada devolve 200 com o Pix.
- **CA-07** — Dado um pedido pago no provedor mock, mas pendente no banco, quando chamo `GET /pedidos?telefone=`, então ele aparece como `pago` (houve reconciliação).
- **CA-08** — Dada a loja fechada, quando chamo `POST /pedidos`, então recebo 409 com o horário.
- **CA-09** — Dado um JSON malformado, quando chamo `POST /pedidos`, então recebo 400 com exemplo do formato.

## Fora de escopo
Rate limiting, versionamento da API, OpenAPI gerado automaticamente.

## Histórico
- 2026-10-16 — versão inicial.
- 2026-10-16 — Antes de implementar: quantidade padrão 1, item único sem array e 503 sem `BOT_API_KEY`.
