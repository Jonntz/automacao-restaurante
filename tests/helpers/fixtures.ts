import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { configuracoes, itensCardapio } from "@/lib/db/schema";
import { seedDemo } from "@/lib/db/seed";
import { criarDbTeste } from "./db";

/** IDs do seed demo (ordem de inserção em src/lib/db/seed.ts). */
export const ITEM = {
  xBurguer: 1, // 25,90
  xSalada: 2, // 27,90
  xBacon: 3, // 31,90
  smashDuplo: 4, // 34,90
  batataP: 5, // 14,90
  coca: 8, // 6,50
  guarana: 9, // 6,00
  brownie: 12, // 12,90
} as const;

export const ENDERECO = "Rua das Flores, 45 – apto 12";

export async function criarDbComSeed(): Promise<Db> {
  const db = await criarDbTeste();
  await seedDemo(db);
  return db;
}

export async function desativarItem(db: Db, id: number) {
  await db.update(itensCardapio).set({ disponivel: false }).where(eq(itensCardapio.id, id));
}

export async function fecharLoja(db: Db) {
  await db.update(configuracoes).set({ lojaAberta: false }).where(eq(configuracoes.id, 1));
}

export async function semRetirada(db: Db) {
  await db.update(configuracoes).set({ aceitaRetirada: false }).where(eq(configuracoes.id, 1));
}

/** Relógio controlável para testes que dependem de tempo. */
export function relogio(inicio = new Date("2026-10-16T21:00:00.000Z")) {
  let atual = inicio.getTime();
  return {
    agora: () => new Date(atual),
    avancarMinutos: (min: number) => {
      atual += min * 60_000;
    },
  };
}
