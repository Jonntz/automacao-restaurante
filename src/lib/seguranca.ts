import { createHash, timingSafeEqual } from "node:crypto";

const resumo = (valor: string) => createHash("sha256").update(valor, "utf8").digest();

/**
 * Compara segredos em tempo constante. Comparar os hashes evita vazar o tamanho
 * do segredo esperado. Um segredo esperado vazio nunca autoriza.
 */
export function compararSegredo(recebido: string | null | undefined, esperado: string | null | undefined): boolean {
  if (!esperado || recebido == null) return false;
  return timingSafeEqual(resumo(recebido), resumo(esperado));
}
