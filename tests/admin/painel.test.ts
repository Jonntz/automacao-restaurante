import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { acoesDisponiveis, listarPedidosPainel } from "@/lib/admin/painel";
import { pagamentos, pedidos } from "@/lib/db/schema";
import { garantirCobranca } from "@/lib/pagamentos/cobranca";
import { confirmarPagamento } from "@/lib/pagamentos/confirmar";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { criarDbComSeed, relogio } from "../helpers/fixtures";
import { notificadorEspiao, novoPedido } from "../helpers/pedidos";

async function cenario() {
  const db = await criarDbComSeed();
  // 21:00 UTC = 18:00 em SP
  const rel = relogio(new Date("2026-10-16T21:00:00Z"));
  const provedor = criarProvedorMock({ agora: rel.agora });
  const deps = { provedor, notificador: notificadorEspiao(), agora: rel.agora };
  return { db, rel, deps };
}

const definirStatus = (db: Awaited<ReturnType<typeof criarDbComSeed>>, id: number, status: typeof pedidos.$inferSelect.status, atualizadoEm: Date) =>
  db.update(pedidos).set({ status, atualizadoEm }).where(eq(pedidos.id, id));

describe("listarPedidosPainel (ADM-RF-05, ADM-RF-06, ADM-RF-12)", () => {
  it("agrupa nas 5 colunas, mais antigos primeiro, concluídos só de hoje", async () => {
    const { db, rel, deps } = await cenario();
    const ids: number[] = [];
    for (let q = 1; q <= 7; q++) {
      const p = await novoPedido(db, rel.agora, { itens: [{ itemId: 1, quantidade: q }] });
      await garantirCobranca(db, p.id, deps);
      ids.push(p.id);
      rel.avancarMinutos(1);
    }
    const ontem = new Date("2026-10-16T02:00:00Z"); // 23h do dia 15 em SP
    await definirStatus(db, ids[1], "pago", rel.agora());
    await definirStatus(db, ids[2], "em_preparo", rel.agora());
    await definirStatus(db, ids[3], "saiu_para_entrega", rel.agora());
    await definirStatus(db, ids[4], "entregue", rel.agora());
    await definirStatus(db, ids[5], "cancelado", ontem);
    await definirStatus(db, ids[6], "pago", rel.agora());

    const painel = await listarPedidosPainel(db, { agora: rel.agora(), permiteSimulacao: true });
    const porColuna = Object.fromEntries(painel.colunas.map((c) => [c.id, c.pedidos.map((p) => p.id)]));
    expect(painel.colunas.map((c) => c.titulo)).toEqual([
      "Aguardando pagamento",
      "Pagos — novos",
      "Em preparo",
      "Saiu / Pronto",
      "Concluídos hoje",
    ]);
    expect(porColuna).toEqual({
      aguardando: [ids[0]],
      pagos: [ids[1], ids[6]],
      preparo: [ids[2]],
      saida: [ids[3]],
      concluidos: [ids[4]],
    });
  });

  it("card traz cliente, itens, total formatado, pagamento efetivo e ações", async () => {
    const { db, rel, deps } = await cenario();
    const p = await novoPedido(db, rel.agora);
    await garantirCobranca(db, p.id, deps);
    const painel = await listarPedidosPainel(db, { agora: rel.agora(), permiteSimulacao: true });
    const card = painel.colunas[0].pedidos[0];
    expect(card).toMatchObject({
      numero: "#0001",
      statusTexto: "Aguardando pagamento",
      tipoEntrega: "entrega",
      canal: "whatsapp",
      cliente: { nome: "Ana", telefone: "5511999990000" },
      total: "R$ 43,90",
      pagamento: { status: "pendente" },
      alerta: null,
      acoes: { avancar: null, cancelar: true, simular: true, verificar: true },
    });
    expect(card.itens).toEqual([
      { nome: "X-Burguer", quantidade: 1, observacao: null, subtotal: "R$ 25,90" },
      { nome: "Coca-Cola Lata", quantidade: 2, observacao: null, subtotal: "R$ 13,00" },
    ]);
    expect(card.pagamento?.copiaECola).toMatch(/^000201/);

    rel.avancarMinutos(31);
    const depois = await listarPedidosPainel(db, { agora: rel.agora(), permiteSimulacao: true });
    expect(depois.colunas[0].pedidos[0]).toMatchObject({ pagamento: { status: "expirado" }, acoes: { simular: false } });
  });

  it("alerta de pago após cancelamento", async () => {
    const { db, rel, deps } = await cenario();
    const p = await novoPedido(db, rel.agora);
    const pag = await garantirCobranca(db, p.id, deps);
    await definirStatus(db, p.id, "cancelado", rel.agora());
    await confirmarPagamento(db, pag.id, deps);
    const painel = await listarPedidosPainel(db, { agora: rel.agora(), permiteSimulacao: true });
    expect(painel.colunas[4].pedidos[0].alerta).toBe("PAGO_APOS_CANCELAMENTO");
    expect((await db.select().from(pagamentos))[0].status).toBe("pago");
  });
});

describe("acoesDisponiveis (ADM-RF-10)", () => {
  const base = { id: 1, tipoEntrega: "retirada" as const, pagamentos: [] };
  it.each([
    ["pago", { para: "em_preparo", rotulo: "Iniciar preparo" }, true],
    ["em_preparo", { para: "pronto_para_retirada", rotulo: "Pronto para retirada" }, false],
    ["pronto_para_retirada", { para: "entregue", rotulo: "Concluir" }, false],
    ["entregue", null, false],
  ] as const)("%s", (status, avancar, cancelar) => {
    const a = acoesDisponiveis({ ...base, status }, { agora: new Date(), permiteSimulacao: true });
    expect(a).toEqual({ avancar, cancelar, simular: false, verificar: false });
  });

  it("entrega em preparo → Saiu para entrega", () => {
    const a = acoesDisponiveis({ ...base, tipoEntrega: "entrega", status: "em_preparo" }, { agora: new Date(), permiteSimulacao: true });
    expect(a.avancar).toEqual({ para: "saiu_para_entrega", rotulo: "Saiu para entrega" });
  });

  it("sem simulação no provedor → simular false", () => {
    const pendente = { status: "pendente" as const, expiraEm: new Date(Date.now() + 60_000) };
    const a = acoesDisponiveis(
      { ...base, status: "aguardando_pagamento", pagamentos: [pendente] },
      { agora: new Date(), permiteSimulacao: false },
    );
    expect(a).toMatchObject({ simular: false, verificar: true, cancelar: true });
  });
});
