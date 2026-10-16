import "server-only";
import { getDb } from "@/lib/db/client";
import { getNotificador } from "@/lib/notificacoes/notificador";
import { getProvedorPagamento } from "@/lib/pagamentos/provedor";

/** Dependências reais usadas pelas ações do painel. */
export async function getDepsAdmin() {
  return {
    db: await getDb(),
    notificador: getNotificador(),
    provedor: getProvedorPagamento(),
    agora: () => new Date(),
  };
}

/** Se o provedor não puder ser criado (ex.: AbacatePay sem chave), o botão de simular some. */
export function permiteSimulacao(): boolean {
  try {
    return getProvedorPagamento().permiteSimulacao;
  } catch {
    return false;
  }
}
