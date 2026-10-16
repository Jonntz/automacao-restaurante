import type {
  Canal,
  Cliente,
  ItemPedido,
  Pagamento,
  Pedido,
  StatusPedido,
  TipoEntrega,
} from "@/lib/db/schema";

export type { Canal, StatusPedido, TipoEntrega };

export type EntradaItem = { itemId: number; quantidade: number; observacao?: string | null };

/** `tipoEntrega` chega como string da borda HTTP e é validado no domínio (PED-RF-06). */
export type EntradaCalculo = {
  itens: EntradaItem[];
  tipoEntrega: string;
  endereco?: string | null;
};

export type EntradaPedido = EntradaCalculo & {
  telefone: string;
  nomeCliente?: string | null;
  observacoes?: string | null;
};

export type LinhaCalculada = {
  itemId: number;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  observacao: string | null;
  subtotal: number;
};

export type CodigoErroPedido = "LOJA_FECHADA" | "ITENS_INVALIDOS" | "ENTREGA_INVALIDA";

export type ErroPedido = { ok: false; codigo: CodigoErroPedido; erros: string[] };

export type ResultadoCalculo =
  | {
      ok: true;
      tipoEntrega: TipoEntrega;
      endereco: string | null;
      linhas: LinhaCalculada[];
      subtotal: number;
      taxa: number;
      total: number;
    }
  | ErroPedido;

export type PedidoCompleto = Pedido & {
  cliente: Cliente;
  itens: ItemPedido[];
  /** Mais recente primeiro. */
  pagamentos: Pagamento[];
};

export type ResultadoCriacao = { ok: true; duplicado: boolean; pedido: PedidoCompleto } | ErroPedido;

export type DestinoNotificacao = { telefone: string; canal: Canal };

export interface Notificador {
  /** Nunca lança: falhas de entrega são registradas e engolidas (PED-RF-19). */
  notificar(destino: DestinoNotificacao, mensagem: string): Promise<void>;
}

export type Relogio = () => Date;
