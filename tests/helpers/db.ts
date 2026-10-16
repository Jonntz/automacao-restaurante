import { criarDb, type Db } from "@/lib/db/client";
import { migrar } from "@/lib/db/migrar";

/** Banco libSQL em memória, novo a cada chamada, com as migrations aplicadas (FUN-RF-02). */
export async function criarDbTeste(): Promise<Db> {
  const { db } = await criarDb(":memory:");
  await migrar(db);
  return db;
}
