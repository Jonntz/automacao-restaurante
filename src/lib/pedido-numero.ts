/** Número do pedido exibido ao cliente e no painel: 12 → "#0012". */
export function numeroPedido(id: number): string {
  return `#${String(id).padStart(4, "0")}`;
}
