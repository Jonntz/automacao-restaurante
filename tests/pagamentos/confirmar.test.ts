import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { pagamentos, pedidos } from "@/lib/db/schema";
import { garantirCobranca } from "@/lib/pagamentos/cobranca";
import {
  confirmarPagamento,
  reconciliarPagamento,
  reconciliarPendentesDoCliente,
  simularPagamento,
} from "@/lib/pagamentos/confirmar";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { ErroCobranca, type PagamentoProvedor } from "@/lib/pagamentos/tipos";
import { criarDbComSeed, relogio } from "../helpers/fixtures";
import { notificadorEspiao, novoPedido, TELEFONE } from "../helpers/pedidos";

async function cenario() {
  const db = await criarDbComSeed();
  const rel = relogio();
  const provedor = criarProvedorMock({ agora: rel.agora });
  const notificador = notificadorEspiao();
  const deps = { provedor, notificador, agora: rel.agora, esperar: vi.fn(async () => {}) };
  const pedido = await novoPedido(db, rel.agora);
  const pagamento = await garantirCobranca(db, pedido.id, deps);
  return { db, rel, provedor, notificador, deps, pedido, pagamento };
}

const statusPedido = async (db: Awaited<ReturnType<typeof criarDbComSeed>>, id: number) =>
  (await db.select().from(pedidos).where(eq(pedidos.id, id)))[0].status;

describe("confirmarPagamento (PAG-RF-08)", () => {
  it("CA-05: idempotente — muda o pedido para pago e notifica uma única vez", async () => {
    const { db, deps, pedido, pagamento, notificador, rel } = await cenario();
    const r1 = await confirmarPagamento(db, pagamento.id, deps);
    const r2 = await confirmarPagamento(db, pagamento.id, deps);
    expect(r1).toEqual({ mudou: true });
    expect(r2).toEqual({ mudou: false });
    expect(await statusPedido(db, pedido.id)).toBe("pago");
    const [pag] = await db.select().from(pagamentos).where(eq(pagamentos.id, pagamento.id));
    expect(pag).toMatchObject({ status: "pago", pagoEm: rel.agora() });
    expect(notificador.notificar).toHaveBeenCalledTimes(1);
    expect(notificador.notificar.mock.calls[0][1]).toMatch(/Pagamento confirmado/);
  });

  it("CA-06: pago após cancelamento mantém o pedido cancelado e alerta", async () => {
    const { db, deps, pedido, pagamento } = await cenario();
    await db.update(pedidos).set({ status: "cancelado" }).where(eq(pedidos.id, pedido.id));
    const r = await confirmarPagamento(db, pagamento.id, deps);
    expect(r).toEqual({ mudou: true, alerta: "PAGO_APOS_CANCELAMENTO" });
    expect(await statusPedido(db, pedido.id)).toBe("cancelado");
  });

  it("confirma mesmo se a cobrança já constava como expirada localmente", async () => {
    const { db, deps, pedido, pagamento } = await cenario();
    await db.update(pagamentos).set({ status: "expirado" }).where(eq(pagamentos.id, pagamento.id));
    expect(await confirmarPagamento(db, pagamento.id, deps)).toEqual({ mudou: true });
    expect(await statusPedido(db, pedido.id)).toBe("pago");
  });
});

describe("reconciliarPagamento (PAG-RF-09)", () => {
  it("pago no provedor → confirma", async () => {
    const { db, deps, provedor, pedido, pagamento } = await cenario();
    await provedor.simularPagamento!(pagamento.provedorId);
    expect(await reconciliarPagamento(db, pagamento.id, deps)).toBe("pago");
    expect(await statusPedido(db, pedido.id)).toBe("pago");
  });

  it("pendente no provedor → nada muda", async () => {
    const { db, deps, pedido, pagamento } = await cenario();
    expect(await reconciliarPagamento(db, pagamento.id, deps)).toBe("pendente");
    expect(await statusPedido(db, pedido.id)).toBe("aguardando_pagamento");
  });

  it.each(["expirado", "cancelado"] as const)("%s no provedor → atualiza o pagamento", async (status) => {
    const { db, deps, pagamento } = await cenario();
    const provedor: PagamentoProvedor = { ...deps.provedor, consultarStatus: async () => status };
    expect(await reconciliarPagamento(db, pagamento.id, { ...deps, provedor })).toBe(status);
    const [pag] = await db.select().from(pagamentos).where(eq(pagamentos.id, pagamento.id));
    expect(pag.status).toBe(status);
  });

  it("já pago localmente não consulta o provedor", async () => {
    const { db, deps, pagamento } = await cenario();
    await confirmarPagamento(db, pagamento.id, deps);
    const espiao = vi.spyOn(deps.provedor, "consultarStatus");
    expect(await reconciliarPagamento(db, pagamento.id, deps)).toBe("pago");
    expect(espiao).not.toHaveBeenCalled();
  });
});

describe("simularPagamento (PAG-RF-10, CA-07)", () => {
  it("mock: pedido termina pago", async () => {
    const { db, deps, pedido } = await cenario();
    expect(await simularPagamento(db, pedido.id, deps)).toBe("pago");
    expect(await statusPedido(db, pedido.id)).toBe("pago");
  });

  it("tenta reconciliar até 3 vezes quando o provedor demora a refletir", async () => {
    const { db, deps, pedido } = await cenario();
    let chamadas = 0;
    const provedor: PagamentoProvedor = {
      ...deps.provedor,
      simularPagamento: async () => {},
      consultarStatus: async () => (++chamadas >= 3 ? "pago" : "pendente"),
    };
    expect(await simularPagamento(db, pedido.id, { ...deps, provedor })).toBe("pago");
    expect(deps.esperar).toHaveBeenCalledTimes(2);
  });

  it("provedor sem simulação → erro", async () => {
    const { db, deps, pedido } = await cenario();
    const provedor = { ...deps.provedor, permiteSimulacao: false };
    await expect(simularPagamento(db, pedido.id, { ...deps, provedor })).rejects.toThrow(ErroCobranca);
  });

  it("sem cobrança pendente → erro", async () => {
    const { db, deps, pedido, rel } = await cenario();
    rel.avancarMinutos(31);
    await expect(simularPagamento(db, pedido.id, deps)).rejects.toThrow(/cobrança Pix pendente/);
  });
});

describe("reconciliarPendentesDoCliente (PAG-RF-11)", () => {
  it("reconcilia no máximo 3 pendentes vigentes e ignora expirados", async () => {
    const { db, deps, rel, provedor } = await cenario(); // 1º pedido + cobrança (vai expirar)
    rel.avancarMinutos(31);
    const ids: number[] = [];
    for (let i = 2; i <= 5; i++) {
      const p = await novoPedido(db, rel.agora, { itens: [{ itemId: 1, quantidade: i }] });
      ids.push((await garantirCobranca(db, p.id, deps)).id);
    }
    const espiao = vi.spyOn(provedor, "consultarStatus");
    const n = await reconciliarPendentesDoCliente(db, TELEFONE, deps);
    expect(n).toBe(3);
    expect(espiao).toHaveBeenCalledTimes(3);
  });

  it("falha do provedor em um pagamento não interrompe os demais", async () => {
    const { db, deps } = await cenario();
    const provedor: PagamentoProvedor = {
      ...deps.provedor,
      consultarStatus: async () => {
        throw new Error("fora do ar");
      },
    };
    await expect(reconciliarPendentesDoCliente(db, TELEFONE, { ...deps, provedor })).resolves.toBe(1);
  });
});
