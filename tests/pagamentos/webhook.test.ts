import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { eventosProcessados, pedidos } from "@/lib/db/schema";
import { garantirCobranca } from "@/lib/pagamentos/cobranca";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import type { PagamentoProvedor } from "@/lib/pagamentos/tipos";
import { processarWebhookAbacatePay } from "@/lib/pagamentos/webhook";
import { criarDbComSeed, relogio } from "../helpers/fixtures";
import { notificadorEspiao, novoPedido } from "../helpers/pedidos";

const SEGREDO = "segredo-webhook-123";

async function cenario() {
  const db = await criarDbComSeed();
  const rel = relogio();
  const provedor = criarProvedorMock({ agora: rel.agora });
  const notificador = notificadorEspiao();
  const deps = { segredoEsperado: SEGREDO, provedor, notificador, agora: rel.agora, log: { warn: vi.fn() } };
  const pedido = await novoPedido(db, rel.agora);
  const pagamento = await garantirCobranca(db, pedido.id, deps);
  const evento = (id: string, data: unknown = { id: pagamento.provedorId, status: "PAID" }) => ({
    id,
    event: "transparent.completed",
    apiVersion: 2,
    devMode: true,
    data,
  });
  const statusPedido = async () => (await db.select().from(pedidos).where(eq(pedidos.id, pedido.id)))[0].status;
  return { db, provedor, deps, pagamento, evento, statusPedido, notificador };
}

describe("processarWebhookAbacatePay (PAG-RF-12/13)", () => {
  it("CA-08: segredo errado ou ausente → 401", async () => {
    const { db, deps, evento } = await cenario();
    for (const segredoRecebido of ["errado", null]) {
      const r = await processarWebhookAbacatePay(db, { segredoRecebido, corpo: evento("log_1") }, deps);
      expect(r.status).toBe(401);
    }
  });

  it("sucesso: reconcilia consultando o provedor e confirma", async () => {
    const { db, provedor, deps, pagamento, evento, statusPedido } = await cenario();
    await provedor.simularPagamento!(pagamento.provedorId);
    const r = await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: evento("log_1") }, deps);
    expect(r).toEqual({ status: 200, corpo: { ok: true, status: "pago" } });
    expect(await statusPedido()).toBe("pago");
  });

  it("CA-08: evento repetido → duplicado, sem reconciliar de novo", async () => {
    const { db, provedor, deps, pagamento, evento } = await cenario();
    await provedor.simularPagamento!(pagamento.provedorId);
    await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: evento("log_1") }, deps);
    const espiao = vi.spyOn(provedor, "consultarStatus");
    const r = await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: evento("log_1") }, deps);
    expect(r).toEqual({ status: 200, corpo: { ok: true, duplicado: true } });
    expect(espiao).not.toHaveBeenCalled();
  });

  it("CA-09: payload diz PAID mas o provedor diz PENDING → nada muda", async () => {
    const { db, deps, evento, statusPedido, notificador } = await cenario();
    const r = await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: evento("log_2") }, deps);
    expect(r).toEqual({ status: 200, corpo: { ok: true, status: "pendente" } });
    expect(await statusPedido()).toBe("aguardando_pagamento");
    expect(notificador.notificar).not.toHaveBeenCalled();
  });

  it("CA-10: id de cobrança desconhecido → 200 e nada muda", async () => {
    const { db, deps, evento, statusPedido } = await cenario();
    const r = await processarWebhookAbacatePay(
      db,
      { segredoRecebido: SEGREDO, corpo: evento("log_3", { id: "pix_char_desconhecido" }) },
      deps,
    );
    expect(r).toEqual({ status: 200, corpo: { ok: true, ignorado: true } });
    expect(await statusPedido()).toBe("aguardando_pagamento");
  });

  it("encontra o id em formatos alternativos de data", async () => {
    const { db, provedor, deps, pagamento, evento, statusPedido } = await cenario();
    await provedor.simularPagamento!(pagamento.provedorId);
    const corpo = evento("log_4", { transparent: { id: pagamento.provedorId } });
    await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo }, deps);
    expect(await statusPedido()).toBe("pago");
  });

  it("erro interno propaga e NÃO marca o evento como processado", async () => {
    const { db, deps, evento } = await cenario();
    const provedor: PagamentoProvedor = {
      ...deps.provedor,
      consultarStatus: async () => {
        throw new Error("fora do ar");
      },
    };
    await expect(
      processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: evento("log_5") }, { ...deps, provedor }),
    ).rejects.toThrow("fora do ar");
    expect(await db.$count(eventosProcessados)).toBe(0);
  });

  it("payload sem id → 400", async () => {
    const { db, deps } = await cenario();
    const r = await processarWebhookAbacatePay(db, { segredoRecebido: SEGREDO, corpo: { event: "x" } }, deps);
    expect(r.status).toBe(400);
  });
});
