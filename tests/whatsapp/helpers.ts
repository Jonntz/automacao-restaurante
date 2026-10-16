import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";

export const APP_SECRET = "segredo-do-app-meta";

/** Carrega um payload de exemplo da Meta com o timestamp (em segundos) ajustado. */
export function payloadMeta(nome: string, agora: Date, idadeSegundos = 5): string {
  const bruto = fs.readFileSync(path.resolve(__dirname, "../fixtures/meta", `${nome}.json`), "utf8");
  return bruto.replaceAll("__TS__", String(Math.floor(agora.getTime() / 1000) - idadeSegundos));
}

export const assinar = (corpo: string, segredo = APP_SECRET) =>
  `sha256=${createHmac("sha256", segredo).update(corpo, "utf8").digest("hex")}`;
