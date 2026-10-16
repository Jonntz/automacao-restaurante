import { describe, expect, it } from "vitest";
import { lerEntradaCriar, lerEntradaRevisar } from "@/lib/bot/entrada";

describe("lerEntradaRevisar — leitura tolerante (BOT-RF-07)", () => {
  it("CA-03: itens como string JSON, aliases snake_case e números em string", () => {
    const r = lerEntradaRevisar({ itens: '[{"item_id":"1","qtd":"2"}]', tipo_entrega: " Retirada " });
    expect(r).toEqual({
      ok: true,
      valor: { itens: [{ itemId: 1, quantidade: 2, observacao: null }], tipoEntrega: "retirada", endereco: null },
    });
  });

  it("aceita id/obs, ignora preço, quantidade ausente vale 1", () => {
    const r = lerEntradaRevisar({
      itens: [{ id: 3, obs: "sem cebola", preco: 1 }],
      tipoEntrega: "entrega",
      endereco: "Rua das Flores, 45",
      total: 1,
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        itens: [{ itemId: 3, quantidade: 1, observacao: "sem cebola" }],
        tipoEntrega: "entrega",
        endereco: "Rua das Flores, 45",
      },
    });
  });

  it("um objeto único em itens vira lista", () => {
    const r = lerEntradaRevisar({ itens: { itemId: 1, quantidade: 1 }, tipoEntrega: "retirada" });
    expect(r.ok && r.valor.itens).toHaveLength(1);
  });

  it("string JSON quebrada em itens → erro com exemplo", () => {
    const r = lerEntradaRevisar({ itens: "[{itemId:1", tipoEntrega: "retirada" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros[0]).toMatch(/itens/);
    expect(r.erros[0]).toMatch(/Exemplo/);
  });

  it("itens ausente e tipoEntrega ausente → dois erros", () => {
    const r = lerEntradaRevisar({});
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros).toHaveLength(2);
  });

  it("itemId não numérico → erro", () => {
    const r = lerEntradaRevisar({ itens: [{ itemId: "abc", quantidade: 1 }], tipoEntrega: "retirada" });
    expect(r.ok).toBe(false);
  });

  it("corpo que não é objeto → erro", () => {
    expect(lerEntradaRevisar(null).ok).toBe(false);
    expect(lerEntradaRevisar("texto").ok).toBe(false);
  });
});

describe("lerEntradaCriar (BOT-RF-04, BOT-RF-07)", () => {
  it("exige telefone e aceita nome_cliente", () => {
    const sem = lerEntradaCriar({ itens: [{ itemId: 1 }], tipoEntrega: "retirada" });
    expect(sem.ok).toBe(false);
    if (!sem.ok) expect(sem.erros.join()).toMatch(/telefone/);

    const com = lerEntradaCriar({
      telefone: " 5511999990000 ",
      nome_cliente: "Ana",
      itens: [{ itemId: 1 }],
      tipoEntrega: "retirada",
      observacoes: "",
    });
    expect(com).toMatchObject({
      ok: true,
      valor: { telefone: "5511999990000", nomeCliente: "Ana", observacoes: null },
    });
  });
});
