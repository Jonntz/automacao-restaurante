import { describe, expect, it } from "vitest";
import { calcularPedido } from "@/lib/pedidos/calcular";
import { criarDbComSeed, desativarItem, ENDERECO, fecharLoja, ITEM, semRetirada } from "../helpers/fixtures";

describe("calcularPedido — caminho feliz (PED-RF-04/05/09)", () => {
  it("CA-02: retirada usa preço do banco e ignora preço enviado", async () => {
    const db = await criarDbComSeed();
    const itemComPrecoFalso = { itemId: ITEM.xBurguer, quantidade: 2, precoUnitario: 1 } as never;
    const r = await calcularPedido(db, { itens: [itemComPrecoFalso], tipoEntrega: "retirada" });
    expect(r).toMatchObject({ ok: true, subtotal: 5180, taxa: 0, total: 5180, endereco: null });
    if (!r.ok) throw new Error("esperava ok");
    expect(r.linhas).toEqual([
      { itemId: 1, nome: "X-Burguer", precoUnitario: 2590, quantidade: 2, observacao: null, subtotal: 5180 },
    ]);
  });

  it("CA-03: entrega soma a taxa", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, {
      itens: [
        { itemId: ITEM.xBacon, quantidade: 1, observacao: " sem cebola " },
        { itemId: ITEM.coca, quantidade: 2 },
      ],
      tipoEntrega: "entrega",
      endereco: `  ${ENDERECO}  `,
    });
    expect(r).toMatchObject({ ok: true, subtotal: 4490, taxa: 500, total: 4990, endereco: ENDERECO });
    if (!r.ok) throw new Error("esperava ok");
    expect(r.linhas[0].observacao).toBe("sem cebola");
  });

  it("descarta endereço quando é retirada", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, {
      itens: [{ itemId: ITEM.coca, quantidade: 1 }],
      tipoEntrega: "retirada",
      endereco: ENDERECO,
    });
    expect(r).toMatchObject({ ok: true, endereco: null });
  });
});

describe("calcularPedido — validações acumuladas (PED-RF-06)", () => {
  it("CA-04: item inexistente e indisponível na mesma resposta", async () => {
    const db = await criarDbComSeed();
    await desativarItem(db, ITEM.xSalada);
    const r = await calcularPedido(db, {
      itens: [
        { itemId: 99, quantidade: 1 },
        { itemId: ITEM.xSalada, quantidade: 1 },
      ],
      tipoEntrega: "retirada",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.codigo).toBe("ITENS_INVALIDOS");
    expect(r.erros).toEqual([
      "O item de id 99 não existe no cardápio. Use apenas IDs do cardápio.",
      "X-Salada (id 2) está indisponível no momento.",
    ]);
  });

  it.each([0, -1, 1.5, 21, Number.NaN])("quantidade inválida %s", async (quantidade) => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, { itens: [{ itemId: ITEM.coca, quantidade }], tipoEntrega: "retirada" });
    expect(r).toMatchObject({ ok: false, codigo: "ITENS_INVALIDOS" });
    if (r.ok) return;
    expect(r.erros[0]).toMatch(/entre 1 e 20/);
  });

  it("lista vazia", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, { itens: [], tipoEntrega: "retirada" });
    expect(r).toEqual({ ok: false, codigo: "ITENS_INVALIDOS", erros: ["O pedido precisa ter pelo menos um item."] });
  });

  it("tipo de entrega inválido", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, { itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "delivery" });
    expect(r).toMatchObject({ ok: false, codigo: "ENTREGA_INVALIDA" });
    if (r.ok) return;
    expect(r.erros[0]).toMatch(/"entrega" ou "retirada"/);
  });

  it.each([undefined, null, "", "Rua 1"])("CA-06: entrega sem endereço válido (%s)", async (endereco) => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, { itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "entrega", endereco });
    expect(r).toMatchObject({ ok: false, codigo: "ENTREGA_INVALIDA" });
    if (r.ok) return;
    expect(r.erros[0]).toMatch(/endereço completo/);
  });

  it("retirada desabilitada na loja", async () => {
    const db = await criarDbComSeed();
    await semRetirada(db);
    const r = await calcularPedido(db, { itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" });
    expect(r).toMatchObject({ ok: false, codigo: "ENTREGA_INVALIDA" });
  });

  it("acumula erro de item e de entrega, com código de itens", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, { itens: [{ itemId: 99, quantidade: 1 }], tipoEntrega: "entrega" });
    expect(r).toMatchObject({ ok: false, codigo: "ITENS_INVALIDOS" });
    if (r.ok) return;
    expect(r.erros).toHaveLength(2);
  });
});

describe("calcularPedido — loja fechada (PED-RF-07, CA-05)", () => {
  it("curto-circuita com o horário", async () => {
    const db = await criarDbComSeed();
    await fecharLoja(db);
    const r = await calcularPedido(db, { itens: [{ itemId: 99, quantidade: 0 }], tipoEntrega: "x" });
    expect(r).toEqual({
      ok: false,
      codigo: "LOJA_FECHADA",
      erros: ["A loja está fechada agora. Horário de funcionamento: Todos os dias, 18h às 23h."],
    });
  });
});

describe("calcularPedido — agregação (PED-RF-08)", () => {
  it("soma linhas iguais e mantém observações diferentes separadas", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, {
      itens: [
        { itemId: ITEM.xBurguer, quantidade: 1 },
        { itemId: ITEM.xBurguer, quantidade: 2, observacao: "  " },
        { itemId: ITEM.xBurguer, quantidade: 1, observacao: "sem cebola" },
        { itemId: ITEM.xBurguer, quantidade: 1, observacao: "com cebola" },
      ],
      tipoEntrega: "retirada",
    });
    if (!r.ok) throw new Error(r.erros.join());
    expect(r.linhas.map((l) => [l.quantidade, l.observacao])).toEqual([
      [3, null],
      [1, "sem cebola"],
      [1, "com cebola"],
    ]);
    expect(r.subtotal).toBe(5 * 2590);
  });

  it("aplica o limite de 20 sobre a soma", async () => {
    const db = await criarDbComSeed();
    const r = await calcularPedido(db, {
      itens: [
        { itemId: ITEM.coca, quantidade: 15 },
        { itemId: ITEM.coca, quantidade: 6 },
      ],
      tipoEntrega: "retirada",
    });
    expect(r).toMatchObject({ ok: false, codigo: "ITENS_INVALIDOS" });
    if (r.ok) return;
    expect(r.erros[0]).toMatch(/Coca-Cola Lata.*21/);
  });
});
