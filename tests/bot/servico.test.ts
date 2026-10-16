import { describe, expect, it, vi } from "vitest";
import { servicoContexto, servicoCriar, servicoListar, servicoRevisar, type DepsBot } from "@/lib/bot/servico";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { ErroProvedorPagamento, type PagamentoProvedor } from "@/lib/pagamentos/tipos";
import { criarDbComSeed, desativarItem, ENDERECO, fecharLoja, ITEM, relogio } from "../helpers/fixtures";
import { notificadorEspiao, TELEFONE } from "../helpers/pedidos";

async function deps(): Promise<DepsBot & { rel: ReturnType<typeof relogio> }> {
  const rel = relogio();
  return {
    db: await criarDbComSeed(),
    provedor: criarProvedorMock({ agora: rel.agora }),
    notificador: notificadorEspiao(),
    agora: rel.agora,
    log: { warn: vi.fn() },
    rel,
  };
}

const corpoPedido = {
  telefone: TELEFONE,
  nomeCliente: "Ana",
  itens: [{ itemId: ITEM.xBurguer, quantidade: 2 }],
  tipoEntrega: "retirada",
};

describe("servicoContexto (BOT-RF-02, CA-02, BOT-RNF-02)", () => {
  it("telefone novo: cliente null, cardápio sem indisponíveis, resposta compacta", async () => {
    const d = await deps();
    await desativarItem(d.db, ITEM.xSalada);
    const r = await servicoContexto(d, TELEFONE);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({
      ok: true,
      restaurante: {
        nome: "Burger Demo",
        lojaAberta: true,
        taxaEntrega: "R$ 5,00",
        taxaEntregaCentavos: 500,
        aceitaRetirada: true,
      },
      cliente: null,
      pedidosRecentes: [],
    });
    expect(r.corpo.cardapioTexto).toContain("[id 1] X-Burguer — R$ 25,90");
    expect(r.corpo.cardapioTexto).not.toContain("X-Salada");
    expect(new TextEncoder().encode(JSON.stringify(r.corpo)).length).toBeLessThan(4096);
  });

  it("cliente existente com até 3 pedidos recentes", async () => {
    const d = await deps();
    for (let q = 1; q <= 4; q++) {
      await servicoCriar(d, { ...corpoPedido, itens: [{ itemId: 1, quantidade: q }] });
    }
    const r = await servicoContexto(d, TELEFONE);
    expect(r.corpo.cliente).toEqual({ nome: "Ana", ultimoEndereco: null });
    expect(r.corpo.pedidosRecentes).toHaveLength(3);
  });

  it("sem telefone → 400", async () => {
    const r = await servicoContexto(await deps(), "");
    expect(r).toEqual({ status: 400, corpo: { ok: false, erros: ["Informe o parâmetro telefone."] } });
  });
});

describe("servicoRevisar (BOT-RF-03, CA-04)", () => {
  it("200 com total oficial", async () => {
    const r = await servicoRevisar(await deps(), { itens: '[{"item_id":"1","qtd":"2"}]', tipoEntrega: "retirada" });
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ ok: true, totalCentavos: 5180 });
  });

  it("item inexistente → 422 com orientação", async () => {
    const r = await servicoRevisar(await deps(), { itens: [{ itemId: 99 }], tipoEntrega: "retirada" });
    expect(r.status).toBe(422);
    expect(r.corpo).toMatchObject({ ok: false, codigo: "ITENS_INVALIDOS" });
    expect(JSON.stringify(r.corpo)).toMatch(/Use apenas IDs do cardápio/);
  });

  it("formato inválido → 400", async () => {
    const r = await servicoRevisar(await deps(), { tipoEntrega: "retirada" });
    expect(r.status).toBe(400);
    expect(r.corpo).toMatchObject({ ok: false, codigo: "FORMATO_INVALIDO" });
  });
});

describe("servicoCriar (BOT-RF-04/05, CA-05/06/08)", () => {
  it("CA-05: 201 com pix; repetir devolve 200 duplicado com o mesmo pix", async () => {
    const d = await deps();
    const r1 = await servicoCriar(d, corpoPedido);
    expect(r1.status).toBe(201);
    expect(r1.corpo).toMatchObject({
      ok: true,
      duplicado: false,
      pedido: { numero: "#0001", status: "aguardando_pagamento", totalCentavos: 5180 },
      pix: { validadeTexto: "30 minutos" },
    });
    const pix1 = (r1.corpo.pix as { copiaECola: string }).copiaECola;
    expect(pix1.startsWith("000201")).toBe(true);

    const r2 = await servicoCriar(d, corpoPedido);
    expect(r2.status).toBe(200);
    expect(r2.corpo).toMatchObject({ ok: true, duplicado: true, pix: { copiaECola: pix1 } });
  });

  it("CA-06: provedor fora → 502 com número; depois que volta, mesma chamada traz o pix", async () => {
    const d = await deps();
    const real = d.provedor;
    const quebrado: PagamentoProvedor = {
      ...real,
      criarCobranca: async () => {
        throw new ErroProvedorPagamento("AbacatePay indisponível (tempo esgotado).");
      },
    };
    const r1 = await servicoCriar({ ...d, provedor: quebrado }, corpoPedido);
    expect(r1.status).toBe(502);
    expect(r1.corpo).toMatchObject({ ok: false, codigo: "PIX_INDISPONIVEL", pedido: { numero: "#0001" } });
    expect(JSON.stringify(r1.corpo)).toMatch(/Pedido #0001 registrado/);

    const r2 = await servicoCriar(d, corpoPedido);
    expect(r2.status).toBe(200);
    expect(r2.corpo).toMatchObject({ ok: true, duplicado: true, pedido: { numero: "#0001" } });
    expect((r2.corpo.pix as { copiaECola: string }).copiaECola).toMatch(/^000201/);
  });

  it("CA-08: loja fechada → 409", async () => {
    const d = await deps();
    await fecharLoja(d.db);
    const r = await servicoCriar(d, corpoPedido);
    expect(r.status).toBe(409);
    expect(r.corpo).toMatchObject({ codigo: "LOJA_FECHADA" });
  });

  it("entrega sem endereço → 422", async () => {
    const r = await servicoCriar(await deps(), { ...corpoPedido, tipoEntrega: "entrega" });
    expect(r.status).toBe(422);
    expect(r.corpo).toMatchObject({ codigo: "ENTREGA_INVALIDA" });
  });

  it("canal derivado do telefone de teste", async () => {
    const r = await servicoCriar(await deps(), { ...corpoPedido, telefone: "teste:sessao-1", tipoEntrega: "entrega", endereco: ENDERECO });
    expect(r.status).toBe(201);
  });
});

describe("servicoListar (BOT-RF-06, CA-07)", () => {
  it("reconcilia pendentes antes de listar", async () => {
    const d = await deps();
    const criado = await servicoCriar(d, corpoPedido);
    const pedidoId = (criado.corpo.pedido as { id: number }).id;
    const pagamento = await d.db.query.pagamentos.findFirst({ where: (p, { eq }) => eq(p.pedidoId, pedidoId) });
    await d.provedor.simularPagamento!(pagamento!.provedorId);

    const r = await servicoListar(d, TELEFONE);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ ok: true, pedidos: [{ numero: "#0001", status: "pago", statusTexto: "Pago" }] });
  });

  it("falha na reconciliação não derruba a listagem", async () => {
    const d = await deps();
    await servicoCriar(d, corpoPedido);
    const quebrado: PagamentoProvedor = {
      ...d.provedor,
      consultarStatus: async () => {
        throw new Error("fora do ar");
      },
    };
    const r = await servicoListar({ ...d, provedor: quebrado }, TELEFONE);
    expect(r.status).toBe(200);
    expect(r.corpo).toMatchObject({ pedidos: [{ status: "aguardando_pagamento", pix: { expirado: false } }] });
  });

  it("sem telefone → 400; telefone sem pedidos → lista vazia", async () => {
    const d = await deps();
    expect((await servicoListar(d, "")).status).toBe(400);
    expect((await servicoListar(d, "5500000000000")).corpo).toEqual({ ok: true, pedidos: [] });
  });
});
