CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nome_unique` ON `categorias` (`nome`);--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`telefone` text NOT NULL,
	`nome` text,
	`ultimo_endereco` text,
	`criado_em` integer NOT NULL,
	`atualizado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_telefone_unique` ON `clientes` (`telefone`);--> statement-breakpoint
CREATE TABLE `configuracoes` (
	`id` integer PRIMARY KEY NOT NULL,
	`nome` text NOT NULL,
	`loja_aberta` integer DEFAULT true NOT NULL,
	`taxa_entrega_centavos` integer DEFAULT 0 NOT NULL,
	`tempo_estimado` text NOT NULL,
	`horario` text NOT NULL,
	`aceita_retirada` integer DEFAULT true NOT NULL,
	`endereco_retirada` text NOT NULL,
	`atualizado_em` integer NOT NULL,
	CONSTRAINT "configuracoes_linha_unica" CHECK("configuracoes"."id" = 1),
	CONSTRAINT "configuracoes_taxa_positiva" CHECK("configuracoes"."taxa_entrega_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE `eventos_processados` (
	`chave` text PRIMARY KEY NOT NULL,
	`origem` text NOT NULL,
	`criado_em` integer NOT NULL,
	CONSTRAINT "eventos_origem_valida" CHECK(origem in ('whatsapp', 'abacatepay'))
);
--> statement-breakpoint
CREATE TABLE `itens_cardapio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer NOT NULL,
	`nome` text NOT NULL,
	`descricao` text DEFAULT '' NOT NULL,
	`preco_centavos` integer NOT NULL,
	`disponivel` integer DEFAULT true NOT NULL,
	`criado_em` integer NOT NULL,
	`atualizado_em` integer NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "itens_cardapio_preco_positivo" CHECK("itens_cardapio"."preco_centavos" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `itens_cardapio_categoria_nome` ON `itens_cardapio` (`categoria_id`,`nome`);--> statement-breakpoint
CREATE TABLE `itens_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`item_cardapio_id` integer,
	`nome` text NOT NULL,
	`preco_unitario_centavos` integer NOT NULL,
	`quantidade` integer NOT NULL,
	`observacao` text,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_cardapio_id`) REFERENCES `itens_cardapio`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "itens_pedido_quantidade" CHECK("itens_pedido"."quantidade" between 1 and 20)
);
--> statement-breakpoint
CREATE INDEX `itens_pedido_pedido` ON `itens_pedido` (`pedido_id`);--> statement-breakpoint
CREATE TABLE `pagamentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`provedor` text NOT NULL,
	`provedor_id` text NOT NULL,
	`status` text DEFAULT 'pendente' NOT NULL,
	`valor_centavos` integer NOT NULL,
	`pix_copia_e_cola` text NOT NULL,
	`pix_qr_code_base64` text,
	`expira_em` integer NOT NULL,
	`pago_em` integer,
	`criado_em` integer NOT NULL,
	`atualizado_em` integer NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "pagamentos_provedor_valido" CHECK(provedor in ('mock', 'abacatepay')),
	CONSTRAINT "pagamentos_status_valido" CHECK(status in ('pendente', 'pago', 'expirado', 'cancelado'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pagamentos_provedor_id_unique` ON `pagamentos` (`provedor_id`);--> statement-breakpoint
CREATE INDEX `pagamentos_pedido` ON `pagamentos` (`pedido_id`);--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cliente_id` integer NOT NULL,
	`status` text DEFAULT 'aguardando_pagamento' NOT NULL,
	`tipo_entrega` text NOT NULL,
	`endereco_entrega` text,
	`observacoes` text,
	`subtotal_centavos` integer NOT NULL,
	`taxa_entrega_centavos` integer NOT NULL,
	`total_centavos` integer NOT NULL,
	`canal` text NOT NULL,
	`assinatura` text NOT NULL,
	`criado_em` integer NOT NULL,
	`atualizado_em` integer NOT NULL,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pedidos_status_valido" CHECK(status in ('aguardando_pagamento', 'pago', 'em_preparo', 'saiu_para_entrega', 'pronto_para_retirada', 'entregue', 'cancelado')),
	CONSTRAINT "pedidos_tipo_entrega_valido" CHECK(tipo_entrega in ('entrega', 'retirada')),
	CONSTRAINT "pedidos_canal_valido" CHECK(canal in ('whatsapp', 'teste')),
	CONSTRAINT "pedidos_total_consistente" CHECK("pedidos"."total_centavos" = "pedidos"."subtotal_centavos" + "pedidos"."taxa_entrega_centavos")
);
--> statement-breakpoint
CREATE INDEX `pedidos_cliente_status_criado` ON `pedidos` (`cliente_id`,`status`,`criado_em`);--> statement-breakpoint
CREATE INDEX `pedidos_status` ON `pedidos` (`status`);