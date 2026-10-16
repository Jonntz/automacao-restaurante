import type { Configuracao, StatusPedido, TipoEntrega } from "@/lib/db/schema";
import { numeroPedido } from "@/lib/pedido-numero";

type Contexto = { numero: string; tipoEntrega: TipoEntrega; config: Pick<Configuracao, "tempoEstimado" | "enderecoRetirada"> };

const MENSAGENS: Partial<Record<StatusPedido, (c: Contexto) => string>> = {
  pago: ({ numero }) => `✅ Pagamento confirmado! Seu pedido ${numero} já foi para a cozinha.`,
  em_preparo: ({ numero }) => `👨‍🍳 Seu pedido ${numero} está sendo preparado.`,
  saiu_para_entrega: ({ numero, config }) =>
    `🛵 Seu pedido ${numero} saiu para entrega! Tempo estimado: ${config.tempoEstimado}.`,
  pronto_para_retirada: ({ numero, config }) =>
    `🛍️ Seu pedido ${numero} está pronto para retirada em ${config.enderecoRetirada}.`,
  entregue: ({ numero }) => `😋 Pedido ${numero} concluído. Obrigado pela preferência!`,
  cancelado: ({ numero }) =>
    `Seu pedido ${numero} foi cancelado. Se tiver alguma dúvida, é só responder esta mensagem.`,
};

/** Texto enviado ao cliente quando o pedido muda de status, ou null se o status não notifica (PED-RF-18). */
export function mensagemDeStatus(
  pedido: { id: number; tipoEntrega: TipoEntrega },
  status: StatusPedido,
  config: Contexto["config"],
): string | null {
  const montar = MENSAGENS[status];
  return montar ? montar({ numero: numeroPedido(pedido.id), tipoEntrega: pedido.tipoEntrega, config }) : null;
}
