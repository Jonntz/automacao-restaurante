import { z } from "zod";
import type { EntradaCalculo, EntradaPedido } from "@/lib/pedidos/tipos";

// Leitura tolerante: o LLM erra formato com frequência (BOT-RF-07). Aceitamos aliases,
// números em string e `itens` como string JSON; preços enviados são descartados.

export const EXEMPLO_CORPO = '{"itens":[{"itemId":1,"quantidade":2}],"tipoEntrega":"retirada"}';

const comoObjeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const textoOpcional = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || null : (v ?? null)),
  z.string().nullable(),
);

const textoObrigatorio = z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1));

const esquemaItem = z.preprocess(
  (v) => {
    const o = comoObjeto(v);
    if (!o) return v;
    return {
      itemId: o.itemId ?? o.item_id ?? o.id,
      quantidade: o.quantidade ?? o.qtd ?? o.quantity ?? 1,
      observacao: o.observacao ?? o.obs ?? o.observacoes ?? null,
    };
  },
  z.object({
    itemId: z.coerce.number().int().positive(),
    quantidade: z.coerce.number(),
    observacao: textoOpcional,
  }),
);

const esquemaItens = z.preprocess((v) => {
  let valor = v;
  if (typeof valor === "string") {
    try {
      valor = JSON.parse(valor);
    } catch {
      return v; // continua string → falha como "não é lista"
    }
  }
  return comoObjeto(valor) ? [valor] : valor;
}, z.array(esquemaItem));

const esquemaRevisar = z.object({
  itens: esquemaItens,
  tipoEntrega: z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.string().min(1)),
  endereco: textoOpcional,
});

const esquemaCriar = esquemaRevisar.extend({
  telefone: textoObrigatorio,
  nomeCliente: textoOpcional,
  observacoes: textoOpcional,
});

function normalizarCorpo(v: unknown): unknown {
  const o = comoObjeto(v);
  if (!o) return v;
  return {
    itens: o.itens ?? o.items,
    tipoEntrega: o.tipoEntrega ?? o.tipo_entrega,
    endereco: o.endereco ?? o["endereço"],
    telefone: o.telefone,
    nomeCliente: o.nomeCliente ?? o.nome_cliente ?? o.nome,
    observacoes: o.observacoes,
  };
}

const MENSAGENS: Record<string, string> = {
  itens: `Campo 'itens' ausente ou inválido: envie uma lista com itemId (número do cardápio) e quantidade. Exemplo: ${EXEMPLO_CORPO}`,
  tipoEntrega: `Campo 'tipoEntrega' ausente: use "entrega" ou "retirada". Exemplo: ${EXEMPLO_CORPO}`,
  telefone: "Campo 'telefone' ausente.",
  corpo: `O corpo precisa ser um objeto JSON. Exemplo: ${EXEMPLO_CORPO}`,
};

function errosDeFormato(erro: z.ZodError): string[] {
  const campos = new Set(erro.issues.map((i) => String(i.path[0] ?? "corpo")));
  return [...campos].map((c) => MENSAGENS[c] ?? `Campo '${c}' inválido.`);
}

export type LeituraEntrada<T> = { ok: true; valor: T } | { ok: false; erros: string[] };

export function lerEntradaRevisar(corpo: unknown): LeituraEntrada<EntradaCalculo> {
  const r = esquemaRevisar.safeParse(normalizarCorpo(corpo));
  return r.success ? { ok: true, valor: r.data } : { ok: false, erros: errosDeFormato(r.error) };
}

export function lerEntradaCriar(corpo: unknown): LeituraEntrada<EntradaPedido> {
  const r = esquemaCriar.safeParse(normalizarCorpo(corpo));
  return r.success ? { ok: true, valor: r.data } : { ok: false, erros: errosDeFormato(r.error) };
}
