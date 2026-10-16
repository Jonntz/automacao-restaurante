import { asc, desc, gte, notInArray, or } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { itensPedido, pagamentos, pedidos, type Pagamento, type StatusPedido, type TipoEntrega } from "@/lib/db/schema";
import { formatarCentavos } from "@/lib/dinheiro";
import { statusEfetivo } from "@/lib/pagamentos/cobranca";
import { numeroPedido } from "@/lib/pedido-numero";
import { proximoStatus, rotuloStatus, TRANSICOES } from "@/lib/pedidos/status";
import type { PedidoCompleto } from "@/lib/pedidos/tipos";
import { inicioDoDiaSaoPaulo } from "./tempo";

export const COLUNAS = [
  { id: "aguardando", titulo: "Aguardando pagamento", status: ["aguardando_pagamento"] },
  { id: "pagos", titulo: "Pagos — novos", status: ["pago"] },
  { id: "preparo", titulo: "Em preparo", status: ["em_preparo"] },
  { id: "saida", titulo: "Saiu / Pronto", status: ["saiu_para_entrega", "pronto_para_retirada"] },
  { id: "concluidos", titulo: "Concluídos hoje", status: ["entregue", "cancelado"] },
] as const satisfies readonly { id: string; titulo: string; status: readonly StatusPedido[] }[];

export type IdColuna = (typeof COLUNAS)[number]["id"];

const ROTULO_AVANCAR: Partial<Record<StatusPedido, string>> = {
  em_preparo: "Iniciar preparo",
  saiu_para_entrega: "Saiu para entrega",
  pronto_para_retirada: "Pronto para retirada",
  entregue: "Concluir",
};

export type AcoesPedido = {
  avancar: { para: StatusPedido; rotulo: string } | null;
  cancelar: boolean;
  simular: boolean;
  verificar: boolean;
};

/** Ações que o card do kanban oferece (ADM-RF-10). */
export function acoesDisponiveis(
  pedido: { status: StatusPedido; tipoEntrega: TipoEntrega; pagamentos: Pick<Pagamento, "status" | "expiraEm">[] },
  { agora, permiteSimulacao }: { agora: Date; permiteSimulacao: boolean },
): AcoesPedido {
  const para = proximoStatus(pedido);
  const aguardando = pedido.status === "aguardando_pagamento";
  const temVigente = pedido.pagamentos.some((p) => statusEfetivo(p, agora) === "pendente");
  return {
    avancar: para ? { para, rotulo: ROTULO_AVANCAR[para] ?? rotuloStatus(para) } : null,
    cancelar: TRANSICOES[pedido.status].includes("cancelado"),
    simular: aguardando && permiteSimulacao && temVigente,
    verificar: aguardando && pedido.pagamentos.length > 0,
  };
}

function montarCard(pedido: PedidoCompleto, opcoes: { agora: Date; permiteSimulacao: boolean }) {
  const ultimo = pedido.pagamentos[0];
  return {
    id: pedido.id,
    numero: numeroPedido(pedido.id),
    status: pedido.status,
    statusTexto: rotuloStatus(pedido.status),
    tipoEntrega: pedido.tipoEntrega,
    canal: pedido.canal,
    cliente: { nome: pedido.cliente.nome, telefone: pedido.cliente.telefone },
    itens: pedido.itens.map((i) => ({
      nome: i.nome,
      quantidade: i.quantidade,
      observacao: i.observacao,
      subtotal: formatarCentavos(i.precoUnitarioCentavos * i.quantidade),
    })),
    observacoes: pedido.observacoes,
    enderecoEntrega: pedido.enderecoEntrega,
    subtotal: formatarCentavos(pedido.subtotalCentavos),
    taxaEntrega: formatarCentavos(pedido.taxaEntregaCentavos),
    total: formatarCentavos(pedido.totalCentavos),
    criadoEm: pedido.criadoEm.toISOString(),
    atualizadoEm: pedido.atualizadoEm.toISOString(),
    pagamento: ultimo
      ? {
          status: statusEfetivo(ultimo, opcoes.agora),
          provedor: ultimo.provedor,
          copiaECola: ultimo.pixCopiaECola,
          expiraEm: ultimo.expiraEm.toISOString(),
          pagoEm: ultimo.pagoEm?.toISOString() ?? null,
        }
      : null,
    alerta:
      pedido.status === "cancelado" && pedido.pagamentos.some((p) => p.status === "pago")
        ? ("PAGO_APOS_CANCELAMENTO" as const)
        : null,
    acoes: acoesDisponiveis(pedido, opcoes),
  };
}

export type CardPedido = ReturnType<typeof montarCard>;
export type EstadoPainel = {
  colunas: { id: IdColuna; titulo: string; pedidos: CardPedido[] }[];
  geradoEm: string;
};

/** Pedidos ativos + concluídos hoje (fuso de SP), agrupados nas colunas do kanban (ADM-RF-05/06). */
export async function listarPedidosPainel(
  db: Db,
  opcoes: { agora: Date; permiteSimulacao: boolean },
): Promise<EstadoPainel> {
  const lista = await db.query.pedidos.findMany({
    where: or(
      notInArray(pedidos.status, ["entregue", "cancelado"]),
      gte(pedidos.atualizadoEm, inicioDoDiaSaoPaulo(opcoes.agora)),
    ),
    orderBy: [asc(pedidos.criadoEm), asc(pedidos.id)],
    with: {
      cliente: true,
      itens: { orderBy: [asc(itensPedido.id)] },
      pagamentos: { orderBy: [desc(pagamentos.id)] },
    },
  });

  const cards = lista.map((p) => montarCard(p, opcoes));
  return {
    colunas: COLUNAS.map((c) => ({
      id: c.id,
      titulo: c.titulo,
      pedidos: cards.filter((card) => (c.status as readonly StatusPedido[]).includes(card.status)),
    })),
    geradoEm: opcoes.agora.toISOString(),
  };
}
