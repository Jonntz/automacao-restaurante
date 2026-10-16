import type { ProvedorPagamento, StatusPagamento } from "@/lib/db/schema";

export type { ProvedorPagamento, StatusPagamento };

export type EntradaCobranca = {
  pedidoId: number;
  valorCentavos: number;
  descricao: string;
  expiraEmSegundos: number;
};

export type CobrancaCriada = {
  provedorId: string;
  copiaECola: string;
  qrCodeBase64: string | null;
  expiraEm: Date;
  status: StatusPagamento;
};

/** Contrato de um provedor Pix (PAG-RF-01). */
export interface PagamentoProvedor {
  readonly nome: ProvedorPagamento;
  readonly permiteSimulacao: boolean;
  criarCobranca(entrada: EntradaCobranca): Promise<CobrancaCriada>;
  consultarStatus(provedorId: string): Promise<StatusPagamento>;
  simularPagamento?(provedorId: string): Promise<void>;
}

/** Falha de comunicação ou recusa do provedor externo. */
export class ErroProvedorPagamento extends Error {
  override name = "ErroProvedorPagamento";
}

/** Regra de negócio da cobrança violada (pedido em estado errado, sem cobrança pendente…). */
export class ErroCobranca extends Error {
  override name = "ErroCobranca";
}
