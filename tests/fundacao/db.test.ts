import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { categorias, itensCardapio } from "@/lib/db/schema";
import { criarDbTeste } from "../helpers/db";

describe("criarDbTeste (FUN-RF-02, CA-03)", () => {
  it("cada banco é isolado", async () => {
    const a = await criarDbTeste();
    const b = await criarDbTeste();
    await a.insert(categorias).values({ nome: "Lanches" });
    expect(await a.$count(categorias)).toBe(1);
    expect(await b.$count(categorias)).toBe(0);
  });

  it("aplica foreign keys e checks", async () => {
    const db = await criarDbTeste();
    await expect(
      db.insert(itensCardapio).values({ categoriaId: 999, nome: "X", precoCentavos: 100 }),
    ).rejects.toThrow();
    const [cat] = await db.insert(categorias).values({ nome: "Lanches" }).returning();
    await expect(
      db.insert(itensCardapio).values({ categoriaId: cat.id, nome: "X", precoCentavos: 0 }),
    ).rejects.toThrow();
  });

  it("cria as 8 tabelas do data-model", async () => {
    const db = await criarDbTeste();
    const tabelas = await db.all<{ name: string }>(
      sql`select name from sqlite_master where type = 'table' order by name`,
    );
    const daApp = tabelas.map((t) => t.name).filter((n) => !n.startsWith("__") && !n.startsWith("sqlite_"));
    expect(daApp).toEqual([
      "categorias",
      "clientes",
      "configuracoes",
      "eventos_processados",
      "itens_cardapio",
      "itens_pedido",
      "pagamentos",
      "pedidos",
    ]);
  });
});

describe("criarDb com arquivo (FUN-RF-03)", () => {
  it("liga o modo WAL em banco de arquivo", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { criarDb } = await import("@/lib/db/client");
    const pasta = mkdtempSync(join(tmpdir(), "db-wal-"));
    const { client } = await criarDb(`file:${join(pasta, "teste.db")}`);
    try {
      const { rows } = await client.execute("PRAGMA journal_mode");
      expect(String(rows[0][0]).toLowerCase()).toBe("wal");
    } finally {
      client.close();
      rmSync(pasta, { recursive: true, force: true });
    }
  });
});
