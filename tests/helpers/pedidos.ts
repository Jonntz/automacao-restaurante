import { vi } from "vitest";
import type { Db } from "@/lib/db/client";
import { criarPedido } from "@/lib/pedidos/criar";
import type { EntradaPedido, Notificador } from "@/lib/pedidos/tipos";
import { ENDERECO } from "./fixtures";

export const TELEFONE = "5511999990000";

export function notificadorEspiao() {
  return { notificar: vi.fn<Notificador["notificar"]>().mockResolvedValue() };
}

/** Cria um pedido de entrega válido (X-Burguer ×1 + Coca ×2 = 25,90 + 13,00 + 5,00 = 43,90). */
export async function novoPedido(db: Db, agora: () => Date, extra: Partial<EntradaPedido> = {}) {
  const r = await criarPedido(
    db,
    {
      telefone: TELEFONE,
      nomeCliente: "Ana",
      itens: [
        { itemId: 1, quantidade: 1 },
        { itemId: 8, quantidade: 2 },
      ],
      tipoEntrega: "entrega",
      endereco: ENDERECO,
      ...extra,
    },
    { agora },
  );
  if (!r.ok) throw new Error(r.erros.join("; "));
  return r.pedido;
}
