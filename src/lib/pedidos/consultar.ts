import { asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { clientes, itensPedido, pagamentos, pedidos } from "@/lib/db/schema";
import type { PedidoCompleto } from "./tipos";

export async function obterPedidoCompleto(db: Db, id: number): Promise<PedidoCompleto | null> {
  const pedido = await db.query.pedidos.findFirst({
    where: eq(pedidos.id, id),
    with: {
      cliente: true,
      itens: { orderBy: [asc(itensPedido.id)] },
      pagamentos: { orderBy: [desc(pagamentos.id)] },
    },
  });
  return pedido ?? null;
}

/** Pedidos do cliente, mais recentes primeiro, com itens e pagamentos (PED-RF-13). */
export async function consultarPedidosDoCliente(
  db: Db,
  telefone: string,
  { limite = 5 }: { limite?: number } = {},
): Promise<PedidoCompleto[]> {
  const cliente = await db.query.clientes.findFirst({ where: eq(clientes.telefone, telefone) });
  if (!cliente) return [];
  return db.query.pedidos.findMany({
    where: eq(pedidos.clienteId, cliente.id),
    orderBy: [desc(pedidos.id)],
    limit: limite,
    with: {
      cliente: true,
      itens: { orderBy: [asc(itensPedido.id)] },
      pagamentos: { orderBy: [desc(pagamentos.id)] },
    },
  });
}
