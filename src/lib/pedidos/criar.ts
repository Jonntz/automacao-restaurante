import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clientes, itensPedido, pedidos } from "@/lib/db/schema";
import { assinaturaPedido } from "./assinatura";
import { calcularPedido, normalizarTexto } from "./calcular";
import { obterPedidoCompleto } from "./consultar";
import type { Canal, EntradaPedido, Relogio, ResultadoCriacao } from "./tipos";

/** Janela em que um "confirmar" repetido devolve o mesmo pedido (PED-RF-12). */
export const JANELA_DEDUPLICACAO_MS = 5 * 60_000;

export function canalDoTelefone(telefone: string): Canal {
  return telefone.startsWith("teste:") ? "teste" : "whatsapp";
}

export async function criarPedido(db: Db, entrada: EntradaPedido, deps: { agora: Relogio }): Promise<ResultadoCriacao> {
  const telefone = entrada.telefone.trim();
  if (!telefone) throw new Error("criarPedido: telefone é obrigatório");

  const calculo = await calcularPedido(db, entrada);
  if (!calculo.ok) return calculo;

  const agora = deps.agora();
  const assinatura = assinaturaPedido(calculo);
  const nome = normalizarTexto(entrada.nomeCliente);

  const { id, duplicado } = await db.transaction(async (tx) => {
    const [cliente] = await tx
      .insert(clientes)
      .values({ telefone, nome, ultimoEndereco: calculo.endereco, criadoEm: agora, atualizadoEm: agora })
      .onConflictDoUpdate({
        target: clientes.telefone,
        set: {
          nome: sql`coalesce(excluded.nome, ${clientes.nome})`,
          ultimoEndereco: sql`coalesce(excluded.ultimo_endereco, ${clientes.ultimoEndereco})`,
          atualizadoEm: agora,
        },
      })
      .returning();

    const [existente] = await tx
      .select({ id: pedidos.id })
      .from(pedidos)
      .where(
        and(
          eq(pedidos.clienteId, cliente.id),
          eq(pedidos.status, "aguardando_pagamento"),
          eq(pedidos.assinatura, assinatura),
          gte(pedidos.criadoEm, new Date(agora.getTime() - JANELA_DEDUPLICACAO_MS)),
        ),
      )
      .orderBy(desc(pedidos.id))
      .limit(1);
    if (existente) return { id: existente.id, duplicado: true };

    const [novo] = await tx
      .insert(pedidos)
      .values({
        clienteId: cliente.id,
        status: "aguardando_pagamento",
        tipoEntrega: calculo.tipoEntrega,
        enderecoEntrega: calculo.endereco,
        observacoes: normalizarTexto(entrada.observacoes),
        subtotalCentavos: calculo.subtotal,
        taxaEntregaCentavos: calculo.taxa,
        totalCentavos: calculo.total,
        canal: canalDoTelefone(telefone),
        assinatura,
        criadoEm: agora,
        atualizadoEm: agora,
      })
      .returning({ id: pedidos.id });

    await tx.insert(itensPedido).values(
      calculo.linhas.map((l) => ({
        pedidoId: novo.id,
        itemCardapioId: l.itemId,
        nome: l.nome,
        precoUnitarioCentavos: l.precoUnitario,
        quantidade: l.quantidade,
        observacao: l.observacao,
      })),
    );
    return { id: novo.id, duplicado: false };
  });

  const pedido = await obterPedidoCompleto(db, id);
  if (!pedido) throw new Error(`Pedido ${id} sumiu logo após ser gravado`);
  return { ok: true, duplicado, pedido };
}
