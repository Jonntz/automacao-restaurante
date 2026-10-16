import { createHmac } from "node:crypto";
import { compararSegredo } from "@/lib/seguranca";

/** Valida X-Hub-Signature-256 = "sha256=" + hex(HMAC-SHA256(appSecret, corpo bruto)) — WPP-RF-02. */
export function validarAssinaturaMeta(corpoBruto: string, cabecalho: string | null, appSecret: string): boolean {
  if (!appSecret || !cabecalho?.startsWith("sha256=")) return false;
  const esperado = createHmac("sha256", appSecret).update(corpoBruto, "utf8").digest("hex");
  return compararSegredo(cabecalho.slice("sha256=".length).toLowerCase(), esperado);
}
