# Modelo de dados (libSQL / SQLite, via Drizzle)

Convenções:
- PK `id INTEGER` com autoincremento.
- Timestamps `INTEGER` em ms (`mode: 'timestamp_ms'`).
- Booleanos `INTEGER` 0/1 (`mode: 'boolean'`).
- Dinheiro `INTEGER` em centavos (Constituição II).
- Nomes de tabela e coluna em `snake_case`.

## Enums (validados na aplicação e com `CHECK` no banco)

| Enum | Valores |
|---|---|
| `status_pedido` | `aguardando_pagamento`, `pago`, `em_preparo`, `saiu_para_entrega`, `pronto_para_retirada`, `entregue`, `cancelado` |
| `tipo_entrega` | `entrega`, `retirada` |
| `canal` | `whatsapp`, `teste` |
| `provedor_pagamento` | `mock`, `abacatepay` |
| `status_pagamento` | `pendente`, `pago`, `expirado`, `cancelado` |
| `origem_evento` | `whatsapp`, `abacatepay` |

## Tabelas

### `configuracoes` — linha única (`id = 1`)
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | sempre 1 |
| nome | text | not null |
| loja_aberta | boolean | not null, default true |
| taxa_entrega_centavos | integer | not null, default 0, `>= 0` |
| tempo_estimado | text | not null, ex.: "40–50 min" |
| horario | text | not null, ex.: "Todos os dias, 18h às 23h" |
| aceita_retirada | boolean | not null, default true |
| endereco_retirada | text | not null |
| atualizado_em | timestamp_ms | not null |

### `categorias`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | |
| nome | text | not null, unique |
| ordem | integer | not null, default 0 |

### `itens_cardapio`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | é o ID que a IA usa nas ferramentas |
| categoria_id | integer FK → categorias.id | not null, `on delete restrict` |
| nome | text | not null; unique com `categoria_id` |
| descricao | text | not null, default '' |
| preco_centavos | integer | not null, `> 0` |
| disponivel | boolean | not null, default true |
| criado_em / atualizado_em | timestamp_ms | not null |

### `clientes`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | |
| telefone | text | not null, unique; wa_id ou `teste:<sessionId>` |
| nome | text | null |
| ultimo_endereco | text | null |
| criado_em / atualizado_em | timestamp_ms | not null |

### `pedidos`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | exibido como `#0001` |
| cliente_id | integer FK → clientes.id | not null |
| status | text (`status_pedido`) | not null, default `aguardando_pagamento` |
| tipo_entrega | text (`tipo_entrega`) | not null |
| endereco_entrega | text | null; obrigatório (na app) se `entrega` |
| observacoes | text | null |
| subtotal_centavos | integer | not null |
| taxa_entrega_centavos | integer | not null |
| total_centavos | integer | not null; = subtotal + taxa |
| canal | text (`canal`) | not null |
| assinatura | text | not null; hash canônico de itens + tipo_entrega (deduplicação) |
| criado_em / atualizado_em | timestamp_ms | not null |

Índices: `(cliente_id, status, criado_em)` e `(status)`.

### `itens_pedido`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | |
| pedido_id | integer FK → pedidos.id | not null, `on delete cascade` |
| item_cardapio_id | integer FK → itens_cardapio.id | null, `on delete set null` |
| nome | text | not null (snapshot) |
| preco_unitario_centavos | integer | not null (snapshot) |
| quantidade | integer | not null, `1..20` |
| observacao | text | null |

### `pagamentos`
| Coluna | Tipo | Regras |
|---|---|---|
| id | integer PK | |
| pedido_id | integer FK → pedidos.id | not null, `on delete cascade` |
| provedor | text (`provedor_pagamento`) | not null |
| provedor_id | text | not null, unique (ex.: `pix_char_...`) |
| status | text (`status_pagamento`) | not null, default `pendente` |
| valor_centavos | integer | not null |
| pix_copia_e_cola | text | not null |
| pix_qr_code_base64 | text | null (data URI) |
| expira_em | timestamp_ms | not null |
| pago_em | timestamp_ms | null |
| criado_em / atualizado_em | timestamp_ms | not null |

Índice: `(pedido_id)`.

### `eventos_processados` — idempotência de webhooks
| Coluna | Tipo | Regras |
|---|---|---|
| chave | text PK | `whatsapp:<wamid>` ou `abacatepay:<eventId>` |
| origem | text (`origem_evento`) | not null |
| criado_em | timestamp_ms | not null |

## Relacionamentos
```
categorias 1──N itens_cardapio
clientes   1──N pedidos 1──N itens_pedido N──0..1 itens_cardapio
                pedidos 1──N pagamentos   (no máximo 1 "pendente" vigente por pedido — regra de app)
```

## Seed demo ("Burger Demo")

Configuração: taxa R$ 5,00; tempo "40–50 min"; horário "Todos os dias, 18h às 23h"; aceita retirada; endereço "Rua Exemplo, 123 – Centro"; loja aberta.

| Categoria (ordem) | Itens (preço) |
|---|---|
| Lanches (1) | X-Burguer (25,90) · X-Salada (27,90) · X-Bacon (31,90) · Smash Duplo (34,90) |
| Porções (2) | Batata Frita P (14,90) · Batata Cheddar e Bacon (24,90) · Onion Rings (19,90) |
| Bebidas (3) | Coca-Cola Lata (6,50) · Guaraná Lata (6,00) · Suco Natural (9,90) · Água sem Gás (4,00) |
| Sobremesas (4) | Brownie (12,90) · Milkshake de Chocolate (18,90) |
