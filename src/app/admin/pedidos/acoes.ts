"use server";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { ResultadoAcao } from "@/lib/admin/cardapio";
import { getDepsAdmin } from "@/lib/admin/deps";
import { exigirSessao } from "@/lib/auth/exigir-sessao";
import { pagamentos, STATUS_PEDIDO } from "@/lib/db/schema";
import { reconciliarPagamento, simularPagamento } from "@/lib/pagamentos/confirmar";
import { ErroCobranca, ErroProvedorPagamento } from "@/lib/pagamentos/tipos";
import { numeroPedido } from "@/lib/pedido-numero";
import { alterarStatus, rotuloStatus } from "@/lib/pedidos/status";

// Ações do kanban (ADM-RF-10). Cada uma revalida a sessão (ADM-RF-03).

const idValido = z.number().int().positive();

function erroConhecido(e: unknown): ResultadoAcao {
  if (e instanceof ErroCobranca || e instanceof ErroProvedorPagamento) return { ok: false, erro: e.message };
  throw e;
}

export async function avancarPedidoAcao(id: number, para: string): Promise<ResultadoAcao> {
  await exigirSessao();
  const status = z.enum(STATUS_PEDIDO).safeParse(para);
  if (!idValido.safeParse(id).success || !status.success) return { ok: false, erro: "Ação inválida." };
  const deps = await getDepsAdmin();
  const r = await alterarStatus(deps.db, id, status.data, { ...deps, origem: "admin" });
  return r.ok
    ? { ok: true, mensagem: `Pedido ${numeroPedido(id)}: ${rotuloStatus(status.data)}.` }
    : { ok: false, erro: r.erro };
}

export async function cancelarPedidoAcao(id: number): Promise<ResultadoAcao> {
  await exigirSessao();
  if (!idValido.safeParse(id).success) return { ok: false, erro: "Ação inválida." };
  const deps = await getDepsAdmin();
  const r = await alterarStatus(deps.db, id, "cancelado", { ...deps, origem: "admin" });
  return r.ok ? { ok: true, mensagem: `Pedido ${numeroPedido(id)} cancelado.` } : { ok: false, erro: r.erro };
}

export async function simularPagamentoAcao(id: number): Promise<ResultadoAcao> {
  await exigirSessao();
  if (!idValido.safeParse(id).success) return { ok: false, erro: "Ação inválida." };
  try {
    const deps = await getDepsAdmin();
    const status = await simularPagamento(deps.db, id, deps);
    return status === "pago"
      ? { ok: true, mensagem: `Pagamento do pedido ${numeroPedido(id)} simulado e confirmado.` }
      : { ok: true, mensagem: "Simulação enviada. A confirmação chega pelo webhook ou pelo botão Verificar." };
  } catch (e) {
    return erroConhecido(e);
  }
}

export async function verificarPagamentoAcao(id: number): Promise<ResultadoAcao> {
  await exigirSessao();
  if (!idValido.safeParse(id).success) return { ok: false, erro: "Ação inválida." };
  try {
    const deps = await getDepsAdmin();
    const [ultimo] = await deps.db
      .select()
      .from(pagamentos)
      .where(eq(pagamentos.pedidoId, id))
      .orderBy(desc(pagamentos.id))
      .limit(1);
    if (!ultimo) return { ok: false, erro: "Este pedido ainda não tem cobrança Pix." };
    const status = await reconciliarPagamento(deps.db, ultimo.id, deps);
    const textos = { pago: "Pagamento confirmado!", pendente: "Ainda aguardando o Pix.", expirado: "O Pix expirou sem pagamento.", cancelado: "A cobrança foi cancelada no provedor." };
    return { ok: true, mensagem: textos[status] };
  } catch (e) {
    return erroConhecido(e);
  }
}
