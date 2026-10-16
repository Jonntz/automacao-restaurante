import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { eventosProcessados, pagamentos } from "@/lib/db/schema";
import { compararSegredo } from "@/lib/seguranca";
import { reconciliarPagamento, type DepsPagamento } from "./confirmar";

type Resultado = { status: number; corpo: Record<string, unknown> };

const comoObjeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : null;

/** O formato de `data` varia por evento; tentamos os caminhos conhecidos (ver plan.md, Riscos). */
export function extrairIdCobranca(data: unknown): string | null {
  const d = comoObjeto(data);
  if (!d) return null;
  const candidatos = [d.id, ...["transparent", "pixQrCode", "billing", "payment"].map((k) => comoObjeto(d[k])?.id)];
  const id = candidatos.find((c): c is string => typeof c === "string" && c.length > 0);
  return id ?? null;
}

/**
 * Webhook do AbacatePay como GATILHO: autentica, deduplica e reconsulta o provedor.
 * O payload nunca decide o status (PAG-RF-12, PAG-RF-13, ADR-04).
 * Erros internos propagam (a rota responde 500 e o provedor tenta de novo).
 */
export async function processarWebhookAbacatePay(
  db: Db,
  entrada: { segredoRecebido: string | null; corpo: unknown },
  deps: DepsPagamento & { segredoEsperado: string | undefined },
): Promise<Resultado> {
  if (!compararSegredo(entrada.segredoRecebido, deps.segredoEsperado)) {
    return { status: 401, corpo: { ok: false, erro: "Não autorizado" } };
  }

  const envelope = comoObjeto(entrada.corpo);
  const eventoId = envelope?.id;
  if (typeof eventoId !== "string" || !eventoId) {
    return { status: 400, corpo: { ok: false, erro: "Payload inválido" } };
  }

  const chave = `abacatepay:${eventoId}`;
  const jaVisto = await db.query.eventosProcessados.findFirst({ where: eq(eventosProcessados.chave, chave) });
  if (jaVisto) return { status: 200, corpo: { ok: true, duplicado: true } };

  const marcarProcessado = () =>
    db
      .insert(eventosProcessados)
      .values({ chave, origem: "abacatepay", criadoEm: deps.agora() })
      .onConflictDoNothing();

  const cobrancaId = extrairIdCobranca(envelope?.data);
  const pagamento = cobrancaId
    ? await db.query.pagamentos.findFirst({ where: eq(pagamentos.provedorId, cobrancaId) })
    : undefined;
  if (!pagamento) {
    (deps.log ?? console).warn(`[webhook abacatepay] evento ${eventoId} (${String(envelope?.event)}) sem cobrança conhecida`);
    await marcarProcessado();
    return { status: 200, corpo: { ok: true, ignorado: true } };
  }

  const status = await reconciliarPagamento(db, pagamento.id, deps);
  await marcarProcessado();
  return { status: 200, corpo: { ok: true, status } };
}
