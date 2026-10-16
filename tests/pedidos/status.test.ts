import { describe, expect, it, vi } from "vitest";
import { STATUS_PEDIDO, type StatusPedido, type TipoEntrega } from "@/lib/db/schema";
import { criarPedido } from "@/lib/pedidos/criar";
import { alterarStatus, podeTransicionar, proximoStatus, rotuloStatus } from "@/lib/pedidos/status";
import type { Notificador } from "@/lib/pedidos/tipos";
import { criarDbComSeed, ENDERECO, relogio } from "../helpers/fixtures";

const VALIDAS: [StatusPedido, StatusPedido, TipoEntrega, "admin" | "pagamento"][] = [
  ["aguardando_pagamento", "pago", "retirada", "pagamento"],
  ["aguardando_pagamento", "cancelado", "retirada", "admin"],
  ["pago", "em_preparo", "entrega", "admin"],
  ["pago", "cancelado", "entrega", "admin"],
  ["em_preparo", "saiu_para_entrega", "entrega", "admin"],
  ["em_preparo", "pronto_para_retirada", "retirada", "admin"],
  ["saiu_para_entrega", "entregue", "entrega", "admin"],
  ["pronto_para_retirada", "entregue", "retirada", "admin"],
];

describe("podeTransicionar (PED-RF-14)", () => {
  it.each(VALIDAS)("%s → %s (%s, %s) é válida", (de, para, tipoEntrega, origem) => {
    expect(podeTransicionar({ id: 1, status: de, tipoEntrega }, para, origem)).toEqual({ ok: true });
  });

  it("CA-09: retirada não pode sair para entrega; entrega não fica pronta para retirada", () => {
    expect(podeTransicionar({ id: 1, status: "em_preparo", tipoEntrega: "retirada" }, "saiu_para_entrega", "admin").ok).toBe(false);
    expect(podeTransicionar({ id: 1, status: "em_preparo", tipoEntrega: "entrega" }, "pronto_para_retirada", "admin").ok).toBe(false);
  });

  it("CA-10: admin não marca como pago", () => {
    const r = podeTransicionar({ id: 12, status: "aguardando_pagamento", tipoEntrega: "retirada" }, "pago", "admin");
    expect(r).toEqual({ ok: false, erro: "Somente a confirmação do Pix pode marcar um pedido como pago." });
  });

  it("estados finais não saem do lugar e não se pula etapa", () => {
    for (const para of STATUS_PEDIDO) {
      expect(podeTransicionar({ id: 1, status: "entregue", tipoEntrega: "entrega" }, para, "admin").ok).toBe(false);
      expect(podeTransicionar({ id: 1, status: "cancelado", tipoEntrega: "entrega" }, para, "admin").ok).toBe(false);
    }
    const r = podeTransicionar({ id: 12, status: "pago", tipoEntrega: "entrega" }, "entregue", "admin");
    expect(r).toEqual({ ok: false, erro: 'Não é possível mudar o pedido #0012 de "Pago" para "Entregue".' });
    expect(podeTransicionar({ id: 1, status: "em_preparo", tipoEntrega: "entrega" }, "cancelado", "admin").ok).toBe(false);
  });
});

describe("proximoStatus e rotuloStatus (PED-RF-15, PED-RF-17)", () => {
  it.each([
    ["aguardando_pagamento", "entrega", null],
    ["pago", "entrega", "em_preparo"],
    ["em_preparo", "entrega", "saiu_para_entrega"],
    ["em_preparo", "retirada", "pronto_para_retirada"],
    ["saiu_para_entrega", "entrega", "entregue"],
    ["pronto_para_retirada", "retirada", "entregue"],
    ["entregue", "entrega", null],
    ["cancelado", "retirada", null],
  ] as const)("%s (%s) → %s", (status, tipoEntrega, esperado) => {
    expect(proximoStatus({ status, tipoEntrega })).toBe(esperado);
  });

  it("rótulos em PT-BR", () => {
    expect(rotuloStatus("aguardando_pagamento")).toBe("Aguardando pagamento");
    expect(rotuloStatus("pronto_para_retirada")).toBe("Pronto para retirada");
    expect(STATUS_PEDIDO.every((s) => rotuloStatus(s).length > 0)).toBe(true);
  });
});

describe("alterarStatus (PED-RF-16, CA-11)", () => {
  async function pedidoPago(tipoEntrega: TipoEntrega = "entrega") {
    const db = await criarDbComSeed();
    const rel = relogio();
    const r = await criarPedido(
      db,
      { telefone: "5511999990000", itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega, endereco: ENDERECO },
      rel,
    );
    if (!r.ok) throw new Error(r.erros.join());
    const notificador = { notificar: vi.fn<Notificador["notificar"]>().mockResolvedValue() };
    const pago = await alterarStatus(db, r.pedido.id, "pago", { origem: "pagamento", notificador, agora: rel.agora });
    if (!pago.ok) throw new Error(pago.erro);
    notificador.notificar.mockClear();
    return { db, rel, notificador, id: r.pedido.id };
  }

  it("grava, atualiza atualizadoEm e notifica uma vez com a mensagem do status", async () => {
    const { db, rel, notificador, id } = await pedidoPago();
    rel.avancarMinutos(3);
    const r = await alterarStatus(db, id, "em_preparo", { origem: "admin", notificador, agora: rel.agora });
    expect(r).toMatchObject({ ok: true, pedido: { status: "em_preparo", atualizadoEm: rel.agora() } });
    expect(notificador.notificar).toHaveBeenCalledTimes(1);
    expect(notificador.notificar).toHaveBeenCalledWith(
      { telefone: "5511999990000", canal: "whatsapp" },
      expect.stringContaining("#0001"),
    );
  });

  it("transição inválida não grava nem notifica", async () => {
    const { db, rel, notificador, id } = await pedidoPago();
    const r = await alterarStatus(db, id, "entregue", { origem: "admin", notificador, agora: rel.agora });
    expect(r.ok).toBe(false);
    expect(notificador.notificar).not.toHaveBeenCalled();
  });

  it("pedido inexistente", async () => {
    const { db, rel, notificador } = await pedidoPago();
    const r = await alterarStatus(db, 999, "em_preparo", { origem: "admin", notificador, agora: rel.agora });
    expect(r).toEqual({ ok: false, erro: "Pedido não encontrado." });
  });

  it("dois cliques simultâneos: só uma transição acontece (lock otimista)", async () => {
    const { db, rel, notificador, id } = await pedidoPago();
    const deps = { origem: "admin" as const, notificador, agora: rel.agora };
    const resultados = await Promise.all([
      alterarStatus(db, id, "em_preparo", deps),
      alterarStatus(db, id, "em_preparo", deps),
    ]);
    expect(resultados.filter((r) => r.ok)).toHaveLength(1);
    const falha = resultados.find((r) => !r.ok);
    expect(falha).toMatchObject({ ok: false });
    expect(notificador.notificar).toHaveBeenCalledTimes(1);
  });
});
