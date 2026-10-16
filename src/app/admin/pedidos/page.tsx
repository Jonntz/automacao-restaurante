import type { Metadata } from "next";
import { Kanban } from "./kanban";

export const metadata: Metadata = { title: "Pedidos — Painel Burger Demo" };

// Shell estático; os dados chegam pelo polling de /api/admin/pedidos.
export default function PaginaPedidos() {
  return <Kanban />;
}
