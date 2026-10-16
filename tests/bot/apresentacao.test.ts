import { describe, expect, it } from "vitest";
import { apresentarCalculo, apresentarListaPedidos, apresentarPedido, apresentarPix } from "@/lib/bot/apresentacao";
import { garantirCobranca } from "@/lib/pagamentos/cobranca";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { calcularPedido } from "@/lib/pedidos/calcular";
import { criarDbComSeed, ENDERECO, relogio } from "../helpers/fixtures";
import { novoPedido } from "../helpers/pedidos";

describe("apresentarCalculo (BOT-RF-03)", () => {
  it("formata valores (formatado + centavos) e monta o resumo em formato WhatsApp", async () => {
    const db = await criarDbComSeed();
    const calc = await calcularPedido(db, {
      itens: [
        { itemId: 3, quantidade: 1, observacao: "sem cebola" },
        { itemId: 8, quantidade: 2 },
      ],
      tipoEntrega: "entrega",
      endereco: ENDERECO,
    });
    if (!calc.ok) throw new Error();
    const a = apresentarCalculo(calc);
    expect(a).toMatchObject({
      ok: true,
      subtotal: "R$ 44,90",
      subtotalCentavos: 4490,
      taxaEntrega: "R$ 5,00",
      taxaEntregaCentavos: 500,
      total: "R$ 49,90",
      totalCentavos: 4990,
    });
    expect(a.linhas[0]).toEqual({
      itemId: 3,
      nome: "X-Bacon",
      quantidade: 1,
      observacao: "sem cebola",
      precoUnitario: "R$ 31,90",
      subtotal: "R$ 31,90",
      subtotalCentavos: 3190,
    });
    expect(a.resumoTexto).toBe(
      "1x X-Bacon (sem cebola) — R$ 31,90\n2x Coca-Cola Lata — R$ 13,00\nTaxa de entrega — R$ 5,00\n*Total: R$ 49,90*",
    );
  });
});

describe("apresentarPedido, apresentarPix e apresentarListaPedidos (BOT-RF-04/06)", () => {
  it("monta pedido, pix com validade e lista com pix só em aguardando", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    const provedor = criarProvedorMock({ agora: rel.agora });
    const pedido = await novoPedido(db, rel.agora, { tipoEntrega: "retirada" });
    const pag = await garantirCobranca(db, pedido.id, { provedor, agora: rel.agora });

    expect(apresentarPedido(pedido)).toMatchObject({
      id: pedido.id,
      numero: "#0001",
      status: "aguardando_pagamento",
      statusTexto: "Aguardando pagamento",
      tipoEntrega: "retirada",
      total: "R$ 38,90",
      totalCentavos: 3890,
    });
    expect(apresentarPedido(pedido).resumoTexto).toContain("*Total: R$ 38,90*");

    expect(apresentarPix(pag, rel.agora())).toEqual({
      copiaECola: pag.pixCopiaECola,
      expiraEm: pag.expiraEm.toISOString(),
      validadeTexto: "30 minutos",
    });

    const comPagamento = { ...pedido, pagamentos: [pag] };
    const [item] = apresentarListaPedidos([comPagamento], rel.agora());
    expect(item).toEqual({
      numero: "#0001",
      status: "aguardando_pagamento",
      statusTexto: "Aguardando pagamento",
      total: "R$ 38,90",
      itensResumo: "1x X-Burguer, 2x Coca-Cola Lata",
      criadoEm: pedido.criadoEm.toISOString(),
      pix: { copiaECola: pag.pixCopiaECola, expirado: false },
    });

    rel.avancarMinutos(31);
    expect(apresentarListaPedidos([comPagamento], rel.agora())[0].pix).toEqual({
      copiaECola: pag.pixCopiaECola,
      expirado: true,
    });
    const pago = { ...comPagamento, status: "pago" as const };
    expect(apresentarListaPedidos([pago], rel.agora())[0]).not.toHaveProperty("pix");
  });
});
