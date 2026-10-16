import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { clientes, itensCardapio, pagamentos, pedidos } from "@/lib/db/schema";
import { assinaturaPedido } from "@/lib/pedidos/assinatura";
import { canalDoTelefone, criarPedido } from "@/lib/pedidos/criar";
import { consultarPedidosDoCliente } from "@/lib/pedidos/consultar";
import { criarDbComSeed, ENDERECO, fecharLoja, ITEM, relogio } from "../helpers/fixtures";

const TEL = "5511999990000";
const linha = (itemId: number, quantidade: number, observacao: string | null = null) => ({
  itemId,
  nome: "x",
  precoUnitario: 1,
  quantidade,
  observacao,
  subtotal: 1,
});

describe("assinaturaPedido (PED-RF-12)", () => {
  it("é estável à ordem das linhas e aos espaços/caixa do endereço", () => {
    const a = assinaturaPedido({
      tipoEntrega: "entrega",
      endereco: "Rua A,  10 ",
      linhas: [linha(1, 2), linha(8, 1, "gelada")],
    });
    const b = assinaturaPedido({
      tipoEntrega: "entrega",
      endereco: "rua a, 10",
      linhas: [linha(8, 1, "gelada"), linha(1, 2)],
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda quando itens, quantidades ou tipo de entrega mudam", () => {
    const base = { tipoEntrega: "retirada" as const, endereco: null, linhas: [linha(1, 2)] };
    const ref = assinaturaPedido(base);
    expect(assinaturaPedido({ ...base, linhas: [linha(1, 3)] })).not.toBe(ref);
    expect(assinaturaPedido({ ...base, linhas: [linha(2, 2)] })).not.toBe(ref);
    expect(assinaturaPedido({ ...base, tipoEntrega: "entrega", endereco: ENDERECO })).not.toBe(ref);
  });
});

describe("canalDoTelefone (PED-RF-11)", () => {
  it("prefixo teste: é canal teste", () => {
    expect(canalDoTelefone("teste:abc")).toBe("teste");
    expect(canalDoTelefone(TEL)).toBe("whatsapp");
  });
});

describe("criarPedido (PED-RF-10, PED-RNF-02)", () => {
  it("grava pedido em aguardando_pagamento com itens em snapshot e totais do servidor", async () => {
    const db = await criarDbComSeed();
    const { agora } = relogio();
    const r = await criarPedido(
      db,
      {
        telefone: TEL,
        nomeCliente: "Ana",
        itens: [
          { itemId: ITEM.xBacon, quantidade: 1, observacao: "sem cebola" },
          { itemId: ITEM.coca, quantidade: 2 },
        ],
        tipoEntrega: "entrega",
        endereco: ENDERECO,
        observacoes: "  Interfone quebrado  ",
      },
      { agora },
    );
    if (!r.ok) throw new Error(r.erros.join());
    expect(r.duplicado).toBe(false);
    expect(r.pedido).toMatchObject({
      status: "aguardando_pagamento",
      tipoEntrega: "entrega",
      enderecoEntrega: ENDERECO,
      observacoes: "Interfone quebrado",
      subtotalCentavos: 4490,
      taxaEntregaCentavos: 500,
      totalCentavos: 4990,
      canal: "whatsapp",
      criadoEm: agora(),
    });
    expect(r.pedido.cliente).toMatchObject({ telefone: TEL, nome: "Ana", ultimoEndereco: ENDERECO });
    expect(r.pedido.itens.map((i) => [i.nome, i.precoUnitarioCentavos, i.quantidade, i.observacao])).toEqual([
      ["X-Bacon", 3190, 1, "sem cebola"],
      ["Coca-Cola Lata", 650, 2, null],
    ]);

    // snapshot: mudar o preço no cardápio não altera o pedido
    await db.update(itensCardapio).set({ precoCentavos: 9999 }).where(eq(itensCardapio.id, ITEM.xBacon));
    const [doBanco] = await consultarPedidosDoCliente(db, TEL);
    expect(doBanco.itens[0].precoUnitarioCentavos).toBe(3190);
  });

  it("erros de cálculo não gravam nada", async () => {
    const db = await criarDbComSeed();
    const r = await criarPedido(
      db,
      { telefone: TEL, itens: [{ itemId: 99, quantidade: 1 }], tipoEntrega: "retirada" },
      relogio(),
    );
    expect(r).toMatchObject({ ok: false, codigo: "ITENS_INVALIDOS" });
    expect(await db.$count(pedidos)).toBe(0);
    expect(await db.$count(clientes)).toBe(0);
  });

  it("loja fechada não grava", async () => {
    const db = await criarDbComSeed();
    await fecharLoja(db);
    const r = await criarPedido(db, { telefone: TEL, itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" }, relogio());
    expect(r).toMatchObject({ ok: false, codigo: "LOJA_FECHADA" });
    expect(await db.$count(pedidos)).toBe(0);
  });
});

describe("criarPedido — cliente e canal (PED-RF-10/11, CA-08)", () => {
  it("cria cliente com nome e atualiza último endereço em pedido de entrega posterior", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    await criarPedido(db, { telefone: TEL, nomeCliente: "Ana", itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" }, rel);
    let [cli] = await db.select().from(clientes);
    expect(cli).toMatchObject({ nome: "Ana", ultimoEndereco: null });

    rel.avancarMinutos(1);
    await criarPedido(db, { telefone: TEL, itens: [{ itemId: 2, quantidade: 1 }], tipoEntrega: "entrega", endereco: ENDERECO }, rel);
    [cli] = await db.select().from(clientes);
    expect(cli).toMatchObject({ nome: "Ana", ultimoEndereco: ENDERECO });
    expect(await db.$count(clientes)).toBe(1);
  });

  it("telefone teste: vira canal teste", async () => {
    const db = await criarDbComSeed();
    const r = await criarPedido(db, { telefone: "teste:sessao1", itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" }, relogio());
    expect(r).toMatchObject({ ok: true, pedido: { canal: "teste" } });
  });
});

describe("criarPedido — deduplicação (PED-RF-12, CA-07)", () => {
  const entrada = { telefone: TEL, itens: [{ itemId: 1, quantidade: 2 }], tipoEntrega: "retirada" };

  it("mesmo pedido em 2 min devolve o existente com duplicado: true", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    const primeiro = await criarPedido(db, entrada, rel);
    rel.avancarMinutos(2);
    const segundo = await criarPedido(db, { ...entrada, itens: [{ itemId: 1, quantidade: 1 }, { itemId: 1, quantidade: 1 }] }, rel);
    if (!primeiro.ok || !segundo.ok) throw new Error("esperava ok");
    expect(segundo.duplicado).toBe(true);
    expect(segundo.pedido.id).toBe(primeiro.pedido.id);
    expect(await db.$count(pedidos)).toBe(1);
  });

  it("depois de 6 min cria um novo", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    await criarPedido(db, entrada, rel);
    rel.avancarMinutos(6);
    const r = await criarPedido(db, entrada, rel);
    expect(r).toMatchObject({ ok: true, duplicado: false });
    expect(await db.$count(pedidos)).toBe(2);
  });

  it("se o anterior já saiu de aguardando_pagamento, cria um novo", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    const primeiro = await criarPedido(db, entrada, rel);
    if (!primeiro.ok) throw new Error();
    await db.update(pedidos).set({ status: "pago" }).where(eq(pedidos.id, primeiro.pedido.id));
    const r = await criarPedido(db, entrada, rel);
    expect(r).toMatchObject({ ok: true, duplicado: false });
  });

  it("itens diferentes não são duplicata", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    await criarPedido(db, entrada, rel);
    const r = await criarPedido(db, { ...entrada, itens: [{ itemId: 1, quantidade: 3 }] }, rel);
    expect(r).toMatchObject({ ok: true, duplicado: false });
  });
});

describe("consultarPedidosDoCliente (PED-RF-13)", () => {
  it("devolve mais recentes primeiro, com itens e pagamentos, respeitando o limite", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    const ids: number[] = [];
    for (let q = 1; q <= 3; q++) {
      const r = await criarPedido(db, { telefone: TEL, itens: [{ itemId: 1, quantidade: q }], tipoEntrega: "retirada" }, rel);
      if (!r.ok) throw new Error();
      ids.push(r.pedido.id);
      rel.avancarMinutos(1);
    }
    await db.insert(pagamentos).values({
      pedidoId: ids[2],
      provedor: "mock",
      provedorId: "mock_1",
      valorCentavos: 100,
      pixCopiaECola: "000201",
      expiraEm: rel.agora(),
    });
    await criarPedido(db, { telefone: "5511888880000", itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" }, rel);

    const lista = await consultarPedidosDoCliente(db, TEL, { limite: 2 });
    expect(lista.map((p) => p.id)).toEqual([ids[2], ids[1]]);
    expect(lista[0].itens).toHaveLength(1);
    expect(lista[0].pagamentos.map((p) => p.provedorId)).toEqual(["mock_1"]);
    expect(lista[0].cliente.telefone).toBe(TEL);
    expect(await consultarPedidosDoCliente(db, "5500000000000")).toEqual([]);
  });
});
