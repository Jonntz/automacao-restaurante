import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { configuracoes } from "@/lib/db/schema";
import type { Relogio } from "@/lib/pedidos/tipos";

/** Abre/fecha a loja; o bot lê a cada mensagem, então o efeito é imediato (ADM-RF-18). */
export async function definirLojaAberta(db: Db, aberta: boolean, agora: Relogio): Promise<void> {
  await db.update(configuracoes).set({ lojaAberta: aberta, atualizadoEm: agora() }).where(eq(configuracoes.id, 1));
}
