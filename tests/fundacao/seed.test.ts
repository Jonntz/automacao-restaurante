import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { categorias, configuracoes, itensCardapio } from "@/lib/db/schema";
import { seedDemo } from "@/lib/db/seed";
import { criarDbTeste } from "../helpers/db";

describe("seedDemo (FUN-RF-05, CA-02)", () => {
  it("cria a configuração, 4 categorias e 13 itens", async () => {
    const db = await criarDbTeste();
    await seedDemo(db);

    const [config] = await db.select().from(configuracoes);
    expect(config).toMatchObject({
      id: 1,
      nome: "Burger Demo",
      lojaAberta: true,
      taxaEntregaCentavos: 500,
      aceitaRetirada: true,
    });
    const cats = await db.select().from(categorias).orderBy(categorias.ordem);
    expect(cats.map((c) => c.nome)).toEqual(["Lanches", "Porções", "Bebidas", "Sobremesas"]);
    expect(await db.$count(itensCardapio)).toBe(13);

    const [xBurguer] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "X-Burguer"));
    expect(xBurguer.precoCentavos).toBe(2590);
    expect(xBurguer.id).toBe(1);
  });

  it("é idempotente e não sobrescreve edições", async () => {
    const db = await criarDbTeste();
    await seedDemo(db);
    await db.update(itensCardapio).set({ precoCentavos: 9990 }).where(eq(itensCardapio.nome, "X-Burguer"));
    await seedDemo(db);

    expect(await db.$count(categorias)).toBe(4);
    expect(await db.$count(itensCardapio)).toBe(13);
    expect(await db.$count(configuracoes)).toBe(1);
    const [xBurguer] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "X-Burguer"));
    expect(xBurguer.precoCentavos).toBe(9990);
  });
});
