import { eq } from "drizzle-orm";
import { obterCardapio, obterConfiguracao } from "@/lib/cardapio/consultar";
import { formatarCardapioTexto } from "@/lib/cardapio/formatar";
import type { Db } from "@/lib/db/client";
import { clientes } from "@/lib/db/schema";
import { garantirCobranca } from "@/lib/pagamentos/cobranca";
import { reconciliarPendentesDoCliente } from "@/lib/pagamentos/confirmar";
import { ErroCobranca, ErroProvedorPagamento, type PagamentoProvedor } from "@/lib/pagamentos/tipos";
import { numeroPedido } from "@/lib/pedido-numero";
import { consultarPedidosDoCliente } from "@/lib/pedidos/consultar";
import { criarPedido } from "@/lib/pedidos/criar";
import { calcularPedido } from "@/lib/pedidos/calcular";
import type { CodigoErroPedido, Notificador, Relogio } from "@/lib/pedidos/tipos";
import {
  apresentarCalculo,
  apresentarContexto,
  apresentarListaPedidos,
  apresentarPedido,
  apresentarPix,
} from "./apresentacao";
import { lerEntradaCriar, lerEntradaRevisar } from "./entrada";

// Orquestração da API do bot com dependências injetadas (004/plan.md).

export type DepsBot = {
  db: Db;
  provedor: PagamentoProvedor;
  notificador: Notificador;
  agora: Relogio;
  log?: { warn: (mensagem: string) => void };
};

export type RespostaBot = { status: number; corpo: Record<string, unknown> };

const HTTP_POR_CODIGO: Record<CodigoErroPedido | "FORMATO_INVALIDO" | "PIX_INDISPONIVEL", number> = {
  ITENS_INVALIDOS: 422,
  ENTREGA_INVALIDA: 422,
  LOJA_FECHADA: 409,
  FORMATO_INVALIDO: 400,
  PIX_INDISPONIVEL: 502,
};

const erro = (codigo: keyof typeof HTTP_POR_CODIGO, erros: string[], extra: Record<string, unknown> = {}): RespostaBot => ({
  status: HTTP_POR_CODIGO[codigo],
  corpo: { ok: false, codigo, erros, ...extra },
});

const semTelefone: RespostaBot = { status: 400, corpo: { ok: false, erros: ["Informe o parâmetro telefone."] } };

export async function servicoContexto(deps: DepsBot, telefone: string): Promise<RespostaBot> {
  const tel = telefone.trim();
  if (!tel) return semTelefone;
  const [config, cardapio, cliente, pedidos] = await Promise.all([
    obterConfiguracao(deps.db),
    obterCardapio(deps.db, { somenteDisponiveis: true }),
    deps.db.query.clientes.findFirst({ where: eq(clientes.telefone, tel) }),
    consultarPedidosDoCliente(deps.db, tel, { limite: 3 }),
  ]);
  return {
    status: 200,
    corpo: apresentarContexto({
      config,
      cardapioTexto: formatarCardapioTexto(cardapio),
      cliente: cliente ?? null,
      pedidos,
    }),
  };
}

export async function servicoRevisar(deps: DepsBot, corpo: unknown): Promise<RespostaBot> {
  const entrada = lerEntradaRevisar(corpo);
  if (!entrada.ok) return erro("FORMATO_INVALIDO", entrada.erros);
  const calculo = await calcularPedido(deps.db, entrada.valor);
  if (!calculo.ok) return erro(calculo.codigo, calculo.erros);
  return { status: 200, corpo: apresentarCalculo(calculo) };
}

export async function servicoCriar(deps: DepsBot, corpo: unknown): Promise<RespostaBot> {
  const entrada = lerEntradaCriar(corpo);
  if (!entrada.ok) return erro("FORMATO_INVALIDO", entrada.erros);

  const criacao = await criarPedido(deps.db, entrada.valor, deps);
  if (!criacao.ok) return erro(criacao.codigo, criacao.erros);
  const { pedido, duplicado } = criacao;

  try {
    const pagamento = await garantirCobranca(deps.db, pedido.id, deps);
    return {
      status: duplicado ? 200 : 201,
      corpo: { ok: true, duplicado, pedido: apresentarPedido(pedido), pix: apresentarPix(pagamento, deps.agora()) },
    };
  } catch (e) {
    if (!(e instanceof ErroProvedorPagamento || e instanceof ErroCobranca)) throw e;
    (deps.log ?? console).warn(`[api do bot] Pix indisponível para o pedido ${pedido.id}: ${e.message}`);
    const numero = numeroPedido(pedido.id);
    return erro(
      "PIX_INDISPONIVEL",
      [`Pedido ${numero} registrado, mas não consegui gerar o Pix agora. Tente confirmar de novo em instantes.`],
      { pedido: { id: pedido.id, numero } },
    );
  }
}

export async function servicoListar(deps: DepsBot, telefone: string): Promise<RespostaBot> {
  const tel = telefone.trim();
  if (!tel) return semTelefone;
  try {
    await reconciliarPendentesDoCliente(deps.db, tel, deps);
  } catch (e) {
    (deps.log ?? console).warn(`[api do bot] reconciliação falhou: ${(e as Error).message}`);
  }
  const pedidos = await consultarPedidosDoCliente(deps.db, tel, { limite: 5 });
  return { status: 200, corpo: { ok: true, pedidos: apresentarListaPedidos(pedidos, deps.agora()) } };
}
