import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { categorias, configuracoes, itensCardapio } from "@/lib/db/schema";
import { seedDemo } from "@/lib/db/seed";
import { criarDbTeste } from "../helpers/db";

describe("seedDemo — pizzaria Container Lanches (FUN-RF-05, MRC-RF-07, CA-04)", () => {
  it("cria a configuração, 5 categorias e 20 itens com o tamanho no nome da categoria", async () => {
    const db = await criarDbTeste();
    await seedDemo(db);

    const [config] = await db.select().from(configuracoes);
    expect(config).toMatchObject({
      id: 1,
      nome: "Container Lanches",
      lojaAberta: true,
      taxaEntregaCentavos: 500,
      aceitaRetirada: true,
    });
    const cats = await db.select().from(categorias).orderBy(categorias.ordem);
    expect(cats.map((c) => c.nome)).toEqual([
      "Pizzas Tradicionais — Grande, 8 fatias",
      "Pizzas Especiais — Grande, 8 fatias",
      "Pizzas Doces — Broto, 4 fatias",
      "Bordas Recheadas",
      "Bebidas",
    ]);
    expect(await db.$count(itensCardapio)).toBe(20);

    const [mussarela] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "Mussarela"));
    expect(mussarela).toMatchObject({ id: 1, precoCentavos: 4990 });
    const [quatroQueijos] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "Quatro Queijos"));
    expect(quatroQueijos.precoCentavos).toBe(6290);
  });

  it("é idempotente e não sobrescreve edições", async () => {
    const db = await criarDbTeste();
    await seedDemo(db);
    await db.update(itensCardapio).set({ precoCentavos: 9990 }).where(eq(itensCardapio.nome, "Calabresa"));
    await seedDemo(db);

    expect(await db.$count(categorias)).toBe(5);
    expect(await db.$count(itensCardapio)).toBe(20);
    expect(await db.$count(configuracoes)).toBe(1);
    const [calabresa] = await db.select().from(itensCardapio).where(eq(itensCardapio.nome, "Calabresa"));
    expect(calabresa.precoCentavos).toBe(9990);
  });
});
