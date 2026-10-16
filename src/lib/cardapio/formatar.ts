import { formatarCentavos } from "@/lib/dinheiro";
import type { CategoriaDoCardapio } from "./consultar";

/** Texto compacto para o system prompt do agente: `[id 3] X-Bacon — R$ 31,90 — descrição` (PED-RF-02). */
export function formatarCardapioTexto(cardapio: CategoriaDoCardapio[]): string {
  return cardapio
    .map((categoria) => {
      const linhas = categoria.itens.map((item) => {
        const base = `[id ${item.id}] ${item.nome} — ${formatarCentavos(item.precoCentavos)}`;
        return item.descricao ? `${base} — ${item.descricao}` : base;
      });
      return [`## ${categoria.nome}`, ...linhas].join("\n");
    })
    .join("\n\n");
}
