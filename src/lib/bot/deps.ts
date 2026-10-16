import { getDb } from "@/lib/db/client";
import { getNotificador } from "@/lib/notificacoes/notificador";
import { getProvedorPagamento } from "@/lib/pagamentos/provedor";
import type { DepsBot } from "./servico";

/** Único ponto de wiring das dependências reais da API do bot. */
export async function getDepsBot(): Promise<DepsBot> {
  return {
    db: await getDb(),
    provedor: getProvedorPagamento(),
    notificador: getNotificador(),
    agora: () => new Date(),
  };
}
