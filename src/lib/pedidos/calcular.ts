import { inArray } from "drizzle-orm";
import { obterConfiguracao } from "@/lib/cardapio/consultar";
import type { Db } from "@/lib/db/client";
import { itensCardapio, TIPO_ENTREGA, type TipoEntrega } from "@/lib/db/schema";
import type { EntradaCalculo, EntradaItem, LinhaCalculada, ResultadoCalculo } from "./tipos";

// Constituição I: preços SEMPRE do banco. Qualquer preço na entrada é ignorado.

export const QUANTIDADE_MAXIMA = 20;
const TAMANHO_MINIMO_ENDERECO = 10;

export function normalizarTexto(valor: string | null | undefined): string | null {
  const limpo = valor?.trim().replace(/\s+/g, " ");
  return limpo ? limpo : null;
}

type LinhaAgregada = { itemId: number; quantidade: number; observacao: string | null };

/** Soma linhas com o mesmo item e a mesma observação, preservando a ordem de chegada (PED-RF-08). */
function agregarLinhas(itens: EntradaItem[]): LinhaAgregada[] {
  const porChave = new Map<string, LinhaAgregada>();
  for (const item of itens) {
    const observacao = normalizarTexto(item.observacao);
    const chave = `${item.itemId}|${observacao ?? ""}`;
    const existente = porChave.get(chave);
    if (existente) existente.quantidade += item.quantidade;
    else porChave.set(chave, { itemId: item.itemId, quantidade: item.quantidade, observacao });
  }
  return [...porChave.values()];
}

const quantidadeValida = (q: number) => Number.isInteger(q) && q >= 1 && q <= QUANTIDADE_MAXIMA;

export async function calcularPedido(db: Db, entrada: EntradaCalculo): Promise<ResultadoCalculo> {
  const config = await obterConfiguracao(db);
  if (!config.lojaAberta) {
    return {
      ok: false,
      codigo: "LOJA_FECHADA",
      erros: [`A loja está fechada agora. Horário de funcionamento: ${config.horario}.`],
    };
  }

  const errosItens: string[] = [];
  const errosEntrega: string[] = [];

  // --- itens ---
  if (entrada.itens.length === 0) errosItens.push("O pedido precisa ter pelo menos um item.");
  for (const item of entrada.itens) {
    if (!quantidadeValida(item.quantidade)) {
      errosItens.push(
        `Quantidade inválida para o item de id ${item.itemId}: use um número inteiro entre 1 e ${QUANTIDADE_MAXIMA}.`,
      );
    }
  }

  const agregadas = errosItens.length ? [] : agregarLinhas(entrada.itens);
  const ids = [...new Set(entrada.itens.map((i) => i.itemId).filter(Number.isInteger))];
  const doBanco = ids.length ? await db.select().from(itensCardapio).where(inArray(itensCardapio.id, ids)) : [];
  const porId = new Map(doBanco.map((i) => [i.id, i]));

  for (const id of ids) {
    const item = porId.get(id);
    if (!item) errosItens.push(`O item de id ${id} não existe no cardápio. Use apenas IDs do cardápio.`);
    else if (!item.disponivel) errosItens.push(`${item.nome} (id ${id}) está indisponível no momento.`);
  }

  const totalPorItem = new Map<number, number>();
  for (const linha of agregadas) totalPorItem.set(linha.itemId, (totalPorItem.get(linha.itemId) ?? 0) + linha.quantidade);
  for (const [id, quantidade] of totalPorItem) {
    if (quantidade > QUANTIDADE_MAXIMA) {
      const nome = porId.get(id)?.nome ?? `id ${id}`;
      errosItens.push(`Quantidade máxima por item é ${QUANTIDADE_MAXIMA} (${nome}: ${quantidade}).`);
    }
  }

  // --- entrega ---
  const tipoEntrega = (TIPO_ENTREGA as readonly string[]).includes(entrada.tipoEntrega)
    ? (entrada.tipoEntrega as TipoEntrega)
    : null;
  const endereco = normalizarTexto(entrada.endereco);
  if (!tipoEntrega) {
    errosEntrega.push('Tipo de entrega inválido: use "entrega" ou "retirada".');
  } else if (tipoEntrega === "entrega" && (!endereco || endereco.length < TAMANHO_MINIMO_ENDERECO)) {
    errosEntrega.push("Para entrega, informe o endereço completo (rua, número e bairro).");
  } else if (tipoEntrega === "retirada" && !config.aceitaRetirada) {
    errosEntrega.push("No momento não fazemos retirada no balcão, apenas entrega.");
  }

  if (errosItens.length || errosEntrega.length || !tipoEntrega) {
    return {
      ok: false,
      codigo: errosItens.length ? "ITENS_INVALIDOS" : "ENTREGA_INVALIDA",
      erros: [...errosItens, ...errosEntrega],
    };
  }

  // --- totais (inteiros em centavos) ---
  const linhas: LinhaCalculada[] = agregadas.map((linha) => {
    const item = porId.get(linha.itemId)!;
    return {
      itemId: item.id,
      nome: item.nome,
      precoUnitario: item.precoCentavos,
      quantidade: linha.quantidade,
      observacao: linha.observacao,
      subtotal: item.precoCentavos * linha.quantidade,
    };
  });
  const subtotal = linhas.reduce((soma, l) => soma + l.subtotal, 0);
  const taxa = tipoEntrega === "entrega" ? config.taxaEntregaCentavos : 0;

  return {
    ok: true,
    tipoEntrega,
    endereco: tipoEntrega === "entrega" ? endereco : null,
    linhas,
    subtotal,
    taxa,
    total: subtotal + taxa,
  };
}
