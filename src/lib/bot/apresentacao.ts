import type { Cliente, Configuracao, Pagamento } from "@/lib/db/schema";
import { formatarCentavos } from "@/lib/dinheiro";
import { statusEfetivo } from "@/lib/pagamentos/cobranca";
import { numeroPedido } from "@/lib/pedido-numero";
import { rotuloStatus } from "@/lib/pedidos/status";
import type { PedidoCompleto, ResultadoCalculo } from "@/lib/pedidos/tipos";

// Respostas pensadas para o LLM: valores sempre formatado + centavos (BOT-RF-08).

type LinhaResumo = { quantidade: number; nome: string; observacao: string | null; subtotal: number };

export function resumoTexto(linhas: LinhaResumo[], taxa: number, total: number): string {
  const partes = linhas.map(
    (l) => `${l.quantidade}x ${l.nome}${l.observacao ? ` (${l.observacao})` : ""} — ${formatarCentavos(l.subtotal)}`,
  );
  if (taxa > 0) partes.push(`Taxa de entrega — ${formatarCentavos(taxa)}`);
  partes.push(`*Total: ${formatarCentavos(total)}*`);
  return partes.join("\n");
}

export function apresentarCalculo(calculo: Extract<ResultadoCalculo, { ok: true }>) {
  return {
    ok: true as const,
    linhas: calculo.linhas.map((l) => ({
      itemId: l.itemId,
      nome: l.nome,
      quantidade: l.quantidade,
      observacao: l.observacao,
      precoUnitario: formatarCentavos(l.precoUnitario),
      subtotal: formatarCentavos(l.subtotal),
      subtotalCentavos: l.subtotal,
    })),
    subtotal: formatarCentavos(calculo.subtotal),
    subtotalCentavos: calculo.subtotal,
    taxaEntrega: formatarCentavos(calculo.taxa),
    taxaEntregaCentavos: calculo.taxa,
    total: formatarCentavos(calculo.total),
    totalCentavos: calculo.total,
    resumoTexto: resumoTexto(calculo.linhas, calculo.taxa, calculo.total),
  };
}

const linhasDoPedido = (pedido: PedidoCompleto): LinhaResumo[] =>
  pedido.itens.map((i) => ({
    quantidade: i.quantidade,
    nome: i.nome,
    observacao: i.observacao,
    subtotal: i.precoUnitarioCentavos * i.quantidade,
  }));

export function apresentarPedido(pedido: PedidoCompleto) {
  return {
    id: pedido.id,
    numero: numeroPedido(pedido.id),
    status: pedido.status,
    statusTexto: rotuloStatus(pedido.status),
    tipoEntrega: pedido.tipoEntrega,
    total: formatarCentavos(pedido.totalCentavos),
    totalCentavos: pedido.totalCentavos,
    resumoTexto: resumoTexto(linhasDoPedido(pedido), pedido.taxaEntregaCentavos, pedido.totalCentavos),
  };
}

export function apresentarPix(pagamento: Pagamento, agora: Date) {
  const minutos = Math.max(1, Math.round((pagamento.expiraEm.getTime() - agora.getTime()) / 60_000));
  return {
    copiaECola: pagamento.pixCopiaECola,
    expiraEm: pagamento.expiraEm.toISOString(),
    validadeTexto: `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`,
  };
}

export function apresentarListaPedidos(pedidos: PedidoCompleto[], agora: Date) {
  return pedidos.map((p) => {
    const ultimo = p.pagamentos[0];
    return {
      numero: numeroPedido(p.id),
      status: p.status,
      statusTexto: rotuloStatus(p.status),
      total: formatarCentavos(p.totalCentavos),
      itensResumo: p.itens.map((i) => `${i.quantidade}x ${i.nome}`).join(", "),
      criadoEm: p.criadoEm.toISOString(),
      ...(p.status === "aguardando_pagamento" && ultimo
        ? { pix: { copiaECola: ultimo.pixCopiaECola, expirado: statusEfetivo(ultimo, agora) === "expirado" } }
        : {}),
    };
  });
}

export function apresentarContexto({
  config,
  cardapioTexto,
  cliente,
  pedidos,
}: {
  config: Configuracao;
  cardapioTexto: string;
  cliente: Cliente | null;
  pedidos: PedidoCompleto[];
}) {
  return {
    ok: true as const,
    restaurante: {
      nome: config.nome,
      lojaAberta: config.lojaAberta,
      horario: config.horario,
      tempoEstimado: config.tempoEstimado,
      taxaEntrega: formatarCentavos(config.taxaEntregaCentavos),
      taxaEntregaCentavos: config.taxaEntregaCentavos,
      aceitaRetirada: config.aceitaRetirada,
      enderecoRetirada: config.enderecoRetirada,
    },
    cardapioTexto,
    cliente: cliente ? { nome: cliente.nome, ultimoEndereco: cliente.ultimoEndereco } : null,
    pedidosRecentes: pedidos.map((p) => ({
      numero: numeroPedido(p.id),
      status: p.status,
      statusTexto: rotuloStatus(p.status),
      total: formatarCentavos(p.totalCentavos),
      criadoEm: p.criadoEm.toISOString(),
    })),
  };
}
