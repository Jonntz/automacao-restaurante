import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { pagamentos, pedidos } from "@/lib/db/schema";
import { garantirCobranca, statusEfetivo, VALIDADE_PIX_SEGUNDOS } from "@/lib/pagamentos/cobranca";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { ErroCobranca } from "@/lib/pagamentos/tipos";
import { criarDbComSeed, relogio } from "../helpers/fixtures";
import { novoPedido } from "../helpers/pedidos";

async function cenario() {
  const db = await criarDbComSeed();
  const rel = relogio();
  const provedor = criarProvedorMock({ agora: rel.agora });
  const pedido = await novoPedido(db, rel.agora);
  return { db, rel, provedor, pedido, deps: { provedor, agora: rel.agora } };
}

describe("garantirCobranca (PAG-RF-06, CA-01)", () => {
  it("cria pagamento pendente com o total do pedido e validade de 30 min", async () => {
    const { db, rel, pedido, deps } = await cenario();
    const pag = await garantirCobranca(db, pedido.id, deps);
    expect(pag).toMatchObject({
      pedidoId: pedido.id,
      provedor: "mock",
      status: "pendente",
      valorCentavos: 4390,
      expiraEm: new Date(rel.agora().getTime() + VALIDADE_PIX_SEGUNDOS * 1000),
    });
    expect(pag.pixCopiaECola).toMatch(/^000201.*6304[0-9A-F]{4}$/);
  });

  it("chamar de novo reutiliza a cobrança vigente sem chamar o provedor", async () => {
    const { db, provedor, pedido, deps } = await cenario();
    const primeiro = await garantirCobranca(db, pedido.id, deps);
    const espiao = vi.spyOn(provedor, "criarCobranca");
    const segundo = await garantirCobranca(db, pedido.id, deps);
    expect(segundo.id).toBe(primeiro.id);
    expect(espiao).not.toHaveBeenCalled();
    expect(await db.$count(pagamentos)).toBe(1);
  });

  it("CA-02: cobrança vencida vira expirado e uma nova é criada", async () => {
    const { db, rel, pedido, deps } = await cenario();
    const antiga = await garantirCobranca(db, pedido.id, deps);
    rel.avancarMinutos(31);
    const nova = await garantirCobranca(db, pedido.id, deps);
    expect(nova.id).not.toBe(antiga.id);
    const [velha] = await db.select().from(pagamentos).where(eq(pagamentos.id, antiga.id));
    expect(velha.status).toBe("expirado");
  });

  it("recusa pedido fora de aguardando_pagamento ou inexistente", async () => {
    const { db, pedido, deps } = await cenario();
    await db.update(pedidos).set({ status: "pago" }).where(eq(pedidos.id, pedido.id));
    await expect(garantirCobranca(db, pedido.id, deps)).rejects.toThrow(ErroCobranca);
    await expect(garantirCobranca(db, 999, deps)).rejects.toThrow(/não encontrado/);
  });

  it("valor abaixo de R$ 1,00 é recusado (PAG-RF-05)", async () => {
    const { db, pedido, deps } = await cenario();
    await db
      .update(pedidos)
      .set({ subtotalCentavos: 50, taxaEntregaCentavos: 0, totalCentavos: 50 })
      .where(eq(pedidos.id, pedido.id));
    await expect(garantirCobranca(db, pedido.id, deps)).rejects.toThrow(/R\$ 1,00/);
  });
});

describe("statusEfetivo (PAG-RF-07)", () => {
  const agora = new Date("2026-10-16T21:00:00Z");
  it("pendente vencido é expirado", () => {
    expect(statusEfetivo({ status: "pendente", expiraEm: new Date("2026-10-16T20:59:59Z") }, agora)).toBe("expirado");
  });
  it("pendente vigente continua pendente; pago continua pago mesmo após a validade", () => {
    expect(statusEfetivo({ status: "pendente", expiraEm: new Date("2026-10-16T21:10:00Z") }, agora)).toBe("pendente");
    expect(statusEfetivo({ status: "pago", expiraEm: new Date("2026-10-16T20:00:00Z") }, agora)).toBe("pago");
  });
});
