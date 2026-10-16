import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { pagamentos } from "@/lib/db/schema";
import { mascararTelefone } from "@/lib/notificacoes/notificador";
import { consultarPedidosDoCliente, obterPedidoCompleto } from "@/lib/pedidos/consultar";
import { alterarStatus } from "@/lib/pedidos/status";
import type { Notificador, Relogio } from "@/lib/pedidos/tipos";
import { statusEfetivo } from "./cobranca";
import { ErroCobranca, type PagamentoProvedor, type StatusPagamento } from "./tipos";

type Log = { warn: (mensagem: string) => void };

export type DepsPagamento = {
  provedor: PagamentoProvedor;
  notificador: Notificador;
  agora: Relogio;
  esperar?: (ms: number) => Promise<void>;
  log?: Log;
};

export type ResultadoConfirmacao = { mudou: boolean; alerta?: "PAGO_APOS_CANCELAMENTO" };

/** Marca o pagamento como pago e avança o pedido. Idempotente (PAG-RF-08). */
export async function confirmarPagamento(
  db: Db,
  pagamentoId: number,
  deps: Pick<DepsPagamento, "notificador" | "agora" | "log">,
): Promise<ResultadoConfirmacao> {
  const agora = deps.agora();
  const [pago] = await db
    .update(pagamentos)
    .set({ status: "pago", pagoEm: agora, atualizadoEm: agora })
    .where(and(eq(pagamentos.id, pagamentoId), ne(pagamentos.status, "pago")))
    .returning();
  if (!pago) return { mudou: false };

  const pedido = await obterPedidoCompleto(db, pago.pedidoId);
  if (pedido?.status === "aguardando_pagamento") {
    const r = await alterarStatus(db, pedido.id, "pago", {
      origem: "pagamento",
      notificador: deps.notificador,
      agora: deps.agora,
    });
    if (!r.ok) (deps.log ?? console).warn(`[pagamento] pagamento ${pagamentoId} confirmado, mas: ${r.erro}`);
    return { mudou: true };
  }
  if (pedido?.status === "cancelado") return { mudou: true, alerta: "PAGO_APOS_CANCELAMENTO" };
  return { mudou: true };
}

/** Único caminho até a confirmação: sempre consulta o provedor (PAG-RF-09, ADR-04). */
export async function reconciliarPagamento(db: Db, pagamentoId: number, deps: DepsPagamento): Promise<StatusPagamento> {
  const pagamento = await db.query.pagamentos.findFirst({ where: eq(pagamentos.id, pagamentoId) });
  if (!pagamento) throw new ErroCobranca(`Pagamento ${pagamentoId} não encontrado.`);
  if (pagamento.status === "pago") return "pago";
  if (pagamento.provedor !== deps.provedor.nome) {
    (deps.log ?? console).warn(
      `[pagamento] pagamento ${pagamentoId} é do provedor ${pagamento.provedor}, mas o configurado é ${deps.provedor.nome}`,
    );
    return statusEfetivo(pagamento, deps.agora());
  }

  const status = await deps.provedor.consultarStatus(pagamento.provedorId);
  if (status === "pago") {
    await confirmarPagamento(db, pagamentoId, deps);
    return "pago";
  }
  if (status === "expirado" || status === "cancelado") {
    await db
      .update(pagamentos)
      .set({ status, atualizadoEm: deps.agora() })
      .where(and(eq(pagamentos.id, pagamentoId), ne(pagamentos.status, "pago")));
    return status;
  }
  return statusEfetivo(pagamento, deps.agora());
}

const esperarPadrao = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Simula o Pix no provedor (dev) e reconcilia até 3 vezes (PAG-RF-10). */
export async function simularPagamento(db: Db, pedidoId: number, deps: DepsPagamento): Promise<StatusPagamento> {
  const { provedor } = deps;
  if (!provedor.permiteSimulacao || !provedor.simularPagamento) {
    throw new ErroCobranca("O provedor de pagamento atual não permite simulação.");
  }
  const pedido = await obterPedidoCompleto(db, pedidoId);
  if (!pedido) throw new ErroCobranca(`Pedido ${pedidoId} não encontrado.`);
  const agora = deps.agora();
  const vigente = pedido.pagamentos.find((p) => statusEfetivo(p, agora) === "pendente");
  if (!vigente) throw new ErroCobranca("Não há cobrança Pix pendente para este pedido.");

  await provedor.simularPagamento(vigente.provedorId);

  const esperar = deps.esperar ?? esperarPadrao;
  let status: StatusPagamento = "pendente";
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    status = await reconciliarPagamento(db, vigente.id, deps);
    if (status === "pago" || tentativa === 3) break;
    await esperar(1000);
  }
  return status;
}

/** Reconcilia até 3 cobranças pendentes do cliente; devolve quantas foram verificadas (PAG-RF-11). */
export async function reconciliarPendentesDoCliente(db: Db, telefone: string, deps: DepsPagamento): Promise<number> {
  const agora = deps.agora();
  const pendentes = (await consultarPedidosDoCliente(db, telefone, { limite: 10 }))
    .flatMap((p) => p.pagamentos)
    .filter((p) => statusEfetivo(p, agora) === "pendente")
    .slice(0, 3);

  for (const pagamento of pendentes) {
    try {
      await reconciliarPagamento(db, pagamento.id, deps);
    } catch (erro) {
      (deps.log ?? console).warn(
        `[pagamento] falha ao reconciliar ${pagamento.id} de ${mascararTelefone(telefone)}: ${(erro as Error).message}`,
      );
    }
  }
  return pendentes.length;
}
