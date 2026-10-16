import type { Db } from "@/lib/db/client";
import { eventosProcessados } from "@/lib/db/schema";
import { validarAssinaturaMeta } from "./assinatura";
import { extrairMensagens, type MensagemNormalizada } from "./parse";

export type ResultadoGateway = {
  status: number;
  corpo: Record<string, unknown>;
  encaminhar: MensagemNormalizada[];
};

/**
 * Gateway do webhook da Meta (ADR-03): valida o HMAC, filtra e deduplica.
 * Grava o wamid ANTES de encaminhar — "no máximo uma vez" (WPP-RF-06).
 */
export async function processarWebhookWhatsapp(
  db: Db,
  { corpoBruto, assinatura }: { corpoBruto: string; assinatura: string | null },
  deps: { appSecret: string; agora: () => Date; log?: { warn: (m: string) => void } },
): Promise<ResultadoGateway> {
  if (!validarAssinaturaMeta(corpoBruto, assinatura, deps.appSecret)) {
    return { status: 401, corpo: { ok: false, erro: "Assinatura inválida" }, encaminhar: [] };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    (deps.log ?? console).warn("[whatsapp] payload assinado, mas não é JSON válido — ignorado");
    return { status: 200, corpo: { ok: true }, encaminhar: [] };
  }

  const agora = deps.agora();
  const novas: MensagemNormalizada[] = [];
  for (const mensagem of extrairMensagens(payload, agora)) {
    const gravado = await db
      .insert(eventosProcessados)
      .values({ chave: `whatsapp:${mensagem.messageId}`, origem: "whatsapp", criadoEm: agora })
      .onConflictDoNothing()
      .returning({ chave: eventosProcessados.chave });
    if (gravado.length) novas.push(mensagem);
  }
  return { status: 200, corpo: { ok: true }, encaminhar: novas };
}
