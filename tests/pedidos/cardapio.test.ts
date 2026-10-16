import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { obterCardapio, obterConfiguracao } from "@/lib/cardapio/consultar";
import { formatarCardapioTexto } from "@/lib/cardapio/formatar";
import { itensCardapio } from "@/lib/db/schema";
import { criarDbComSeed, desativarItem, ITEM } from "../helpers/fixtures";

describe("obterCardapio (PED-RF-01, CA-01)", () => {
  it("devolve categorias na ordem com itens ordenados por id", async () => {
    const db = await criarDbComSeed();
    const cardapio = await obterCardapio(db, { somenteDisponiveis: false });
    expect(cardapio.map((c) => c.nome)).toEqual(["Lanches", "Porções", "Bebidas", "Sobremesas"]);
    expect(cardapio[0].itens.map((i) => i.id)).toEqual([1, 2, 3, 4]);
  });

  it("filtra indisponíveis quando pedido", async () => {
    const db = await criarDbComSeed();
    await desativarItem(db, ITEM.xSalada);
    const cardapio = await obterCardapio(db, { somenteDisponiveis: true });
    const nomes = cardapio.flatMap((c) => c.itens.map((i) => i.nome));
    expect(nomes).not.toContain("X-Salada");
    expect(nomes).toContain("X-Burguer");
  });

  it("omite categoria sem itens visíveis", async () => {
    const db = await criarDbComSeed();
    await db.update(itensCardapio).set({ disponivel: false }).where(eq(itensCardapio.categoriaId, 4));
    const cardapio = await obterCardapio(db, { somenteDisponiveis: true });
    expect(cardapio.map((c) => c.nome)).not.toContain("Sobremesas");
  });
});

describe("obterConfiguracao (PED-RF-03)", () => {
  it("devolve a linha única de configuração", async () => {
    const db = await criarDbComSeed();
    const config = await obterConfiguracao(db);
    expect(config.nome).toBe("Burger Demo");
    expect(config.taxaEntregaCentavos).toBe(500);
  });
});

describe("formatarCardapioTexto (PED-RF-02)", () => {
  it("gera uma linha por item agrupada por categoria", async () => {
    const db = await criarDbComSeed();
    const texto = formatarCardapioTexto(await obterCardapio(db, { somenteDisponiveis: true }));
    const normal = texto.replace(/ /g, " ");
    expect(normal).toContain("## Lanches");
    expect(normal).toContain("[id 1] X-Burguer — R$ 25,90 — Pão brioche, hambúrguer 150g, queijo prato");
    expect(normal.indexOf("## Lanches")).toBeLessThan(normal.indexOf("## Bebidas"));
  });

  it("omite o traço da descrição quando ela é vazia", () => {
    const texto = formatarCardapioTexto([
      { id: 1, nome: "Cat", ordem: 1, itens: [{ id: 9, nome: "Água", descricao: "", precoCentavos: 400 }] },
    ]);
    expect(texto.replace(/ /g, " ")).toContain("[id 9] Água — R$ 4,00");
    expect(texto.trim().endsWith("R$ 4,00")).toBe(true);
  });
});
