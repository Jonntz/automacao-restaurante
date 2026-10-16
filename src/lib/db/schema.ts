import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Fonte: specs/001-fundacao/data-model.md

export const STATUS_PEDIDO = [
  "aguardando_pagamento",
  "pago",
  "em_preparo",
  "saiu_para_entrega",
  "pronto_para_retirada",
  "entregue",
  "cancelado",
] as const;
export const TIPO_ENTREGA = ["entrega", "retirada"] as const;
export const CANAL = ["whatsapp", "teste"] as const;
export const PROVEDOR_PAGAMENTO = ["mock", "abacatepay"] as const;
export const STATUS_PAGAMENTO = ["pendente", "pago", "expirado", "cancelado"] as const;
export const ORIGEM_EVENTO = ["whatsapp", "abacatepay"] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export type TipoEntrega = (typeof TIPO_ENTREGA)[number];
export type Canal = (typeof CANAL)[number];
export type ProvedorPagamento = (typeof PROVEDOR_PAGAMENTO)[number];
export type StatusPagamento = (typeof STATUS_PAGAMENTO)[number];
export type OrigemEvento = (typeof ORIGEM_EVENTO)[number];

const emLista = (coluna: string, valores: readonly string[]) =>
  sql.raw(`${coluna} in (${valores.map((v) => `'${v}'`).join(", ")})`);

const criadoEm = () =>
  integer("criado_em", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const atualizadoEm = () =>
  integer("atualizado_em", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const configuracoes = sqliteTable(
  "configuracoes",
  {
    id: integer("id").primaryKey(),
    nome: text("nome").notNull(),
    lojaAberta: integer("loja_aberta", { mode: "boolean" }).notNull().default(true),
    taxaEntregaCentavos: integer("taxa_entrega_centavos").notNull().default(0),
    tempoEstimado: text("tempo_estimado").notNull(),
    horario: text("horario").notNull(),
    aceitaRetirada: integer("aceita_retirada", { mode: "boolean" }).notNull().default(true),
    enderecoRetirada: text("endereco_retirada").notNull(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    check("configuracoes_linha_unica", sql`${t.id} = 1`),
    check("configuracoes_taxa_positiva", sql`${t.taxaEntregaCentavos} >= 0`),
  ],
);

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull().unique(),
  ordem: integer("ordem").notNull().default(0),
});

export const itensCardapio = sqliteTable(
  "itens_cardapio",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id, { onDelete: "restrict" }),
    nome: text("nome").notNull(),
    descricao: text("descricao").notNull().default(""),
    precoCentavos: integer("preco_centavos").notNull(),
    disponivel: integer("disponivel", { mode: "boolean" }).notNull().default(true),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    uniqueIndex("itens_cardapio_categoria_nome").on(t.categoriaId, t.nome),
    check("itens_cardapio_preco_positivo", sql`${t.precoCentavos} > 0`),
  ],
);

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telefone: text("telefone").notNull().unique(),
  nome: text("nome"),
  ultimoEndereco: text("ultimo_endereco"),
  criadoEm: criadoEm(),
  atualizadoEm: atualizadoEm(),
});

export const pedidos = sqliteTable(
  "pedidos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    status: text("status", { enum: STATUS_PEDIDO }).notNull().default("aguardando_pagamento"),
    tipoEntrega: text("tipo_entrega", { enum: TIPO_ENTREGA }).notNull(),
    enderecoEntrega: text("endereco_entrega"),
    observacoes: text("observacoes"),
    subtotalCentavos: integer("subtotal_centavos").notNull(),
    taxaEntregaCentavos: integer("taxa_entrega_centavos").notNull(),
    totalCentavos: integer("total_centavos").notNull(),
    canal: text("canal", { enum: CANAL }).notNull(),
    assinatura: text("assinatura").notNull(),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("pedidos_cliente_status_criado").on(t.clienteId, t.status, t.criadoEm),
    index("pedidos_status").on(t.status),
    check("pedidos_status_valido", emLista("status", STATUS_PEDIDO)),
    check("pedidos_tipo_entrega_valido", emLista("tipo_entrega", TIPO_ENTREGA)),
    check("pedidos_canal_valido", emLista("canal", CANAL)),
    check("pedidos_total_consistente", sql`${t.totalCentavos} = ${t.subtotalCentavos} + ${t.taxaEntregaCentavos}`),
  ],
);

export const itensPedido = sqliteTable(
  "itens_pedido",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pedidoId: integer("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    itemCardapioId: integer("item_cardapio_id").references(() => itensCardapio.id, { onDelete: "set null" }),
    nome: text("nome").notNull(),
    precoUnitarioCentavos: integer("preco_unitario_centavos").notNull(),
    quantidade: integer("quantidade").notNull(),
    observacao: text("observacao"),
  },
  (t) => [
    index("itens_pedido_pedido").on(t.pedidoId),
    check("itens_pedido_quantidade", sql`${t.quantidade} between 1 and 20`),
  ],
);

export const pagamentos = sqliteTable(
  "pagamentos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    pedidoId: integer("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    provedor: text("provedor", { enum: PROVEDOR_PAGAMENTO }).notNull(),
    provedorId: text("provedor_id").notNull().unique(),
    status: text("status", { enum: STATUS_PAGAMENTO }).notNull().default("pendente"),
    valorCentavos: integer("valor_centavos").notNull(),
    pixCopiaECola: text("pix_copia_e_cola").notNull(),
    pixQrCodeBase64: text("pix_qr_code_base64"),
    expiraEm: integer("expira_em", { mode: "timestamp_ms" }).notNull(),
    pagoEm: integer("pago_em", { mode: "timestamp_ms" }),
    criadoEm: criadoEm(),
    atualizadoEm: atualizadoEm(),
  },
  (t) => [
    index("pagamentos_pedido").on(t.pedidoId),
    check("pagamentos_provedor_valido", emLista("provedor", PROVEDOR_PAGAMENTO)),
    check("pagamentos_status_valido", emLista("status", STATUS_PAGAMENTO)),
  ],
);

export const eventosProcessados = sqliteTable(
  "eventos_processados",
  {
    chave: text("chave").primaryKey(),
    origem: text("origem", { enum: ORIGEM_EVENTO }).notNull(),
    criadoEm: criadoEm(),
  },
  () => [check("eventos_origem_valida", emLista("origem", ORIGEM_EVENTO))],
);

export type Configuracao = typeof configuracoes.$inferSelect;
export type Categoria = typeof categorias.$inferSelect;
export type ItemCardapio = typeof itensCardapio.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Pedido = typeof pedidos.$inferSelect;
export type ItemPedido = typeof itensPedido.$inferSelect;
export type Pagamento = typeof pagamentos.$inferSelect;
