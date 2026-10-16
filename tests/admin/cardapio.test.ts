import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  alternarDisponibilidade,
  excluirCategoria,
  excluirItem,
  salvarCategoria,
  salvarItem,
} from "@/lib/admin/cardapio";
import { definirLojaAberta } from "@/lib/admin/loja";
import { obterCardapio, obterConfiguracao } from "@/lib/cardapio/consultar";
import { formatarCardapioTexto } from "@/lib/cardapio/formatar";
import { categorias, itensCardapio, itensPedido } from "@/lib/db/schema";
import { criarDbComSeed, ITEM, relogio } from "../helpers/fixtures";
import { novoPedido } from "../helpers/pedidos";

const agora = () => new Date("2026-10-16T21:00:00Z");

describe("salvarItem (ADM-RF-15, CA-07)", () => {
  it("cria item com preço em reais convertido para centavos e já aparece para o bot", async () => {
    const db = await criarDbComSeed();
    const r = await salvarItem(db, { categoriaId: 2, nome: " Coxinha ", descricao: "Frango", preco: "7,50", disponivel: true }, agora);
    expect(r).toEqual({ ok: true, mensagem: "Item “Coxinha” salvo." });
    const [item] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "Coxinha"));
    expect(item.precoCentavos).toBe(750);
    const texto = formatarCardapioTexto(await obterCardapio(db, { somenteDisponiveis: true }));
    expect(texto).toContain(`[id ${item.id}] Coxinha — R$ 7,50`);
  });

  it("edita item existente", async () => {
    const db = await criarDbComSeed();
    const r = await salvarItem(db, { id: ITEM.xBurguer, categoriaId: 1, nome: "X-Burguer", descricao: "Novo", preco: "R$ 26,90", disponivel: true }, agora);
    expect(r.ok).toBe(true);
    const [item] = await db.select().from(itensCardapio).where(eq(itensCardapio.id, ITEM.xBurguer));
    expect(item).toMatchObject({ precoCentavos: 2690, descricao: "Novo" });
  });

  it.each(["0", "abc", "", "-5"])("preço inválido %s", async (preco) => {
    const db = await criarDbComSeed();
    const r = await salvarItem(db, { categoriaId: 1, nome: "Teste", descricao: "", preco, disponivel: true }, agora);
    expect(r).toMatchObject({ ok: false, campos: { preco: expect.any(String) } });
  });

  it("nome vazio e categoria inexistente", async () => {
    const db = await criarDbComSeed();
    const r = await salvarItem(db, { categoriaId: 99, nome: "  ", descricao: "", preco: "10", disponivel: true }, agora);
    expect(r).toMatchObject({ ok: false, campos: { nome: expect.any(String), categoriaId: expect.any(String) } });
  });

  it("nome duplicado na mesma categoria", async () => {
    const db = await criarDbComSeed();
    const r = await salvarItem(db, { categoriaId: 1, nome: "X-Bacon", descricao: "", preco: "10", disponivel: true }, agora);
    expect(r).toEqual({ ok: false, erro: "Já existe um item com esse nome nesta categoria.", campos: { nome: "Nome repetido" } });
  });
});

describe("categorias (ADM-RF-14, ADM-RF-17)", () => {
  it("cria e renomeia categoria; nome duplicado é recusado", async () => {
    const db = await criarDbComSeed();
    expect(await salvarCategoria(db, { nome: "Combos", ordem: "5" })).toMatchObject({ ok: true });
    const [combos] = await db.select().from(categorias).where(eq(categorias.nome, "Combos"));
    expect(await salvarCategoria(db, { id: combos.id, nome: "Combos da Casa", ordem: "0" })).toMatchObject({ ok: true });
    expect(await salvarCategoria(db, { nome: "Lanches", ordem: "1" })).toMatchObject({ ok: false });
    expect(await salvarCategoria(db, { nome: "X", ordem: "-1" })).toMatchObject({ ok: false, campos: { ordem: expect.any(String) } });
  });

  it("excluir categoria com itens é recusado; vazia é excluída", async () => {
    const db = await criarDbComSeed();
    expect(await excluirCategoria(db, 1)).toMatchObject({ ok: false, erro: expect.stringMatching(/tem itens/) });
    await salvarCategoria(db, { nome: "Vazia", ordem: "9" });
    const [vazia] = await db.select().from(categorias).where(eq(categorias.nome, "Vazia"));
    expect(await excluirCategoria(db, vazia.id)).toMatchObject({ ok: true });
  });
});

describe("excluirItem e disponibilidade (ADM-RF-16, ADM-RF-17, CA-08)", () => {
  it("excluir item preserva o snapshot do pedido", async () => {
    const db = await criarDbComSeed();
    const rel = relogio();
    await novoPedido(db, rel.agora);
    expect(await excluirItem(db, ITEM.xBurguer)).toMatchObject({ ok: true });
    const linhas = await db.select().from(itensPedido);
    expect(linhas[0]).toMatchObject({ itemCardapioId: null, nome: "X-Burguer", precoUnitarioCentavos: 2590 });
  });

  it("alternar disponibilidade tira o item do cardápio do bot", async () => {
    const db = await criarDbComSeed();
    await alternarDisponibilidade(db, ITEM.xBacon, false, agora);
    const texto = formatarCardapioTexto(await obterCardapio(db, { somenteDisponiveis: true }));
    expect(texto).not.toContain("X-Bacon");
    expect(await alternarDisponibilidade(db, 999, true, agora)).toMatchObject({ ok: false });
  });
});

describe("definirLojaAberta (ADM-RF-18, CA-09)", () => {
  it("abre e fecha a loja", async () => {
    const db = await criarDbComSeed();
    await definirLojaAberta(db, false, agora);
    expect((await obterConfiguracao(db)).lojaAberta).toBe(false);
    await definirLojaAberta(db, true, agora);
    expect((await obterConfiguracao(db)).lojaAberta).toBe(true);
  });
});
