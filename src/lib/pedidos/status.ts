import { and, eq } from "drizzle-orm";
import { obterConfiguracao } from "@/lib/cardapio/consultar";
import type { Db } from "@/lib/db/client";
import { pedidos } from "@/lib/db/schema";
import { mensagemDeStatus } from "@/lib/notificacoes/mensagens";
import { numeroPedido } from "@/lib/pedido-numero";
import { obterPedidoCompleto } from "./consultar";
import type { Notificador, PedidoCompleto, Relogio, StatusPedido, TipoEntrega } from "./tipos";

export type OrigemMudanca = "admin" | "pagamento";

/** Transições permitidas (PED-RF-14). */
export const TRANSICOES: Record<StatusPedido, readonly StatusPedido[]> = {
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_preparo", "cancelado"],
  em_preparo: ["saiu_para_entrega", "pronto_para_retirada"],
  saiu_para_entrega: ["entregue"],
  pronto_para_retirada: ["entregue"],
  entregue: [],
  cancelado: [],
};

const ROTULOS: Record<StatusPedido, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  pronto_para_retirada: "Pronto para retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const rotuloStatus = (status: StatusPedido) => ROTULOS[status];

type PedidoParaTransicao = { id: number; status: StatusPedido; tipoEntrega: TipoEntrega };

export function podeTransicionar(
  pedido: PedidoParaTransicao,
  para: StatusPedido,
  origem: OrigemMudanca,
): { ok: true } | { ok: false; erro: string } {
  if (para === "pago" && origem !== "pagamento") {
    return { ok: false, erro: "Somente a confirmação do Pix pode marcar um pedido como pago." };
  }
  const permitida =
    TRANSICOES[pedido.status].includes(para) &&
    !(para === "saiu_para_entrega" && pedido.tipoEntrega !== "entrega") &&
    !(para === "pronto_para_retirada" && pedido.tipoEntrega !== "retirada");
  if (!permitida) {
    return {
      ok: false,
      erro: `Não é possível mudar o pedido ${numeroPedido(pedido.id)} de "${rotuloStatus(pedido.status)}" para "${rotuloStatus(para)}".`,
    };
  }
  return { ok: true };
}

/** Próximo passo "feliz" que o admin pode aplicar, ou null (PED-RF-15). */
export function proximoStatus(pedido: { status: StatusPedido; tipoEntrega: TipoEntrega }): StatusPedido | null {
  switch (pedido.status) {
    case "pago":
      return "em_preparo";
    case "em_preparo":
      return pedido.tipoEntrega === "entrega" ? "saiu_para_entrega" : "pronto_para_retirada";
    case "saiu_para_entrega":
    case "pronto_para_retirada":
      return "entregue";
    default:
      return null;
  }
}

export type ResultadoMudanca = { ok: true; pedido: PedidoCompleto } | { ok: false; erro: string };

/** Valida, grava com lock otimista e notifica o cliente (PED-RF-16). */
export async function alterarStatus(
  db: Db,
  pedidoId: number,
  novoStatus: StatusPedido,
  deps: { origem: OrigemMudanca; notificador: Notificador; agora: Relogio },
): Promise<ResultadoMudanca> {
  const pedido = await obterPedidoCompleto(db, pedidoId);
  if (!pedido) return { ok: false, erro: "Pedido não encontrado." };

  const validacao = podeTransicionar(pedido, novoStatus, deps.origem);
  if (!validacao.ok) return validacao;

  const alterados = await db
    .update(pedidos)
    .set({ status: novoStatus, atualizadoEm: deps.agora() })
    .where(and(eq(pedidos.id, pedidoId), eq(pedidos.status, pedido.status)))
    .returning({ id: pedidos.id });
  if (alterados.length === 0) {
    return { ok: false, erro: "O pedido foi alterado por outra ação. Atualize a tela e tente de novo." };
  }

  const atualizado = (await obterPedidoCompleto(db, pedidoId))!;
  const mensagem = mensagemDeStatus(atualizado, novoStatus, await obterConfiguracao(db));
  if (mensagem) {
    await deps.notificador.notificar({ telefone: atualizado.cliente.telefone, canal: atualizado.canal }, mensagem);
  }
  return { ok: true, pedido: atualizado };
}
