import { and, eq } from "drizzle-orm";
import { obterConfiguracao } from "@/lib/cardapio/consultar";
import type { Db } from "@/lib/db/client";
import { pagamentos, type Pagamento } from "@/lib/db/schema";
import { numeroPedido } from "@/lib/pedido-numero";
import { obterPedidoCompleto } from "@/lib/pedidos/consultar";
import type { Relogio } from "@/lib/pedidos/tipos";
import { ErroCobranca, type PagamentoProvedor, type StatusPagamento } from "./tipos";

export const VALIDADE_PIX_SEGUNDOS = 30 * 60;
/** Mínimo exigido pelo AbacatePay (PAG-RF-05). */
export const VALOR_MINIMO_CENTAVOS = 100;

/** Pendente vencido conta como expirado, sem precisar de cron (PAG-RF-07). */
export function statusEfetivo(pagamento: Pick<Pagamento, "status" | "expiraEm">, agora: Date): StatusPagamento {
  if (pagamento.status === "pendente" && agora.getTime() > pagamento.expiraEm.getTime()) return "expirado";
  return pagamento.status;
}

/** Devolve a cobrança Pix vigente do pedido, criando uma nova se preciso (PAG-RF-06). Idempotente. */
export async function garantirCobranca(
  db: Db,
  pedidoId: number,
  deps: { provedor: PagamentoProvedor; agora: Relogio },
): Promise<Pagamento> {
  const pedido = await obterPedidoCompleto(db, pedidoId);
  if (!pedido) throw new ErroCobranca(`Pedido ${pedidoId} não encontrado.`);
  if (pedido.status !== "aguardando_pagamento") {
    throw new ErroCobranca(`O pedido ${numeroPedido(pedido.id)} não está aguardando pagamento.`);
  }
  if (pedido.totalCentavos < VALOR_MINIMO_CENTAVOS) {
    throw new ErroCobranca("O valor mínimo para pagamento via Pix é R$ 1,00.");
  }

  const agora = deps.agora();
  const pendentes = pedido.pagamentos.filter((p) => p.status === "pendente");
  const vigente = pendentes.find((p) => statusEfetivo(p, agora) === "pendente");
  if (vigente) return vigente;

  for (const vencido of pendentes) {
    await db
      .update(pagamentos)
      .set({ status: "expirado", atualizadoEm: agora })
      .where(and(eq(pagamentos.id, vencido.id), eq(pagamentos.status, "pendente")));
  }

  const config = await obterConfiguracao(db);
  const cobranca = await deps.provedor.criarCobranca({
    pedidoId: pedido.id,
    valorCentavos: pedido.totalCentavos,
    descricao: `Pedido ${numeroPedido(pedido.id)} - ${config.nome}`,
    expiraEmSegundos: VALIDADE_PIX_SEGUNDOS,
  });

  const [novo] = await db
    .insert(pagamentos)
    .values({
      pedidoId: pedido.id,
      provedor: deps.provedor.nome,
      provedorId: cobranca.provedorId,
      status: cobranca.status,
      valorCentavos: pedido.totalCentavos,
      pixCopiaECola: cobranca.copiaECola,
      pixQrCodeBase64: cobranca.qrCodeBase64,
      expiraEm: cobranca.expiraEm,
      criadoEm: agora,
      atualizadoEm: agora,
    })
    .returning();
  return novo;
}
