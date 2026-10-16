import { createHash } from "node:crypto";
import type { TipoEntrega } from "./tipos";

type BaseAssinatura = {
  tipoEntrega: TipoEntrega;
  endereco: string | null;
  linhas: { itemId: number; quantidade: number; observacao: string | null }[];
};

/** Hash estável de itens + entrega, usado para detectar "confirmar" repetido (PED-RF-12). */
export function assinaturaPedido({ tipoEntrega, endereco, linhas }: BaseAssinatura): string {
  const canonico = {
    tipoEntrega,
    endereco: endereco ? endereco.toLowerCase().replace(/\s+/g, " ").trim() : null,
    linhas: linhas
      .map((l) => [l.itemId, l.quantidade, l.observacao ?? ""] as const)
      .sort((a, b) => a[0] - b[0] || a[2].localeCompare(b[2])),
  };
  return createHash("sha256").update(JSON.stringify(canonico)).digest("hex");
}
