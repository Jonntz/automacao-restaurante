import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import { categorias, itensCardapio } from "@/lib/db/schema";
import { parseReais } from "@/lib/dinheiro";
import type { Relogio } from "@/lib/pedidos/tipos";

// Manutenção do cardápio pelo admin (ADM-RF-14…17). Funções puras sobre o banco;
// as server actions só fazem sessão + FormData → estas funções.

export type ResultadoAcao =
  | { ok: true; mensagem: string }
  | { ok: false; erro: string; campos?: Record<string, string> };

function ehViolacaoUnica(erro: unknown): boolean {
  for (let e = erro as { message?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (String(e.message).includes("UNIQUE constraint failed")) return true;
  }
  return false;
}

function camposComErro(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {};
  for (const issue of erro.issues) campos[String(issue.path[0])] ??= issue.message;
  return campos;
}

const falhaValidacao = (campos: Record<string, string>): ResultadoAcao => ({
  ok: false,
  erro: "Confira os campos destacados.",
  campos,
});

const esquemaCategoria = z.object({
  id: z.coerce.number().int().positive().optional(),
  nome: z.string().trim().min(1, "Informe o nome").max(60, "Máximo de 60 caracteres"),
  ordem: z.coerce.number({ error: "Informe um número" }).int("Use um número inteiro").min(0, "Use 0 ou mais"),
});

export async function salvarCategoria(db: Db, entrada: { id?: number | string; nome: string; ordem: string | number }): Promise<ResultadoAcao> {
  const v = esquemaCategoria.safeParse(entrada);
  if (!v.success) return falhaValidacao(camposComErro(v.error));
  const { id, nome, ordem } = v.data;
  try {
    if (id) await db.update(categorias).set({ nome, ordem }).where(eq(categorias.id, id));
    else await db.insert(categorias).values({ nome, ordem });
    return { ok: true, mensagem: `Categoria “${nome}” salva.` };
  } catch (e) {
    if (ehViolacaoUnica(e)) return { ok: false, erro: "Já existe uma categoria com esse nome.", campos: { nome: "Nome repetido" } };
    throw e;
  }
}

export async function excluirCategoria(db: Db, id: number): Promise<ResultadoAcao> {
  const itens = await db.$count(itensCardapio, eq(itensCardapio.categoriaId, id));
  if (itens > 0) return { ok: false, erro: "A categoria tem itens. Exclua ou mova os itens antes." };
  await db.delete(categorias).where(eq(categorias.id, id));
  return { ok: true, mensagem: "Categoria excluída." };
}

const esquemaItem = z.object({
  id: z.coerce.number().int().positive().optional(),
  categoriaId: z.coerce.number().int().positive("Escolha uma categoria"),
  nome: z.string().trim().min(1, "Informe o nome").max(80, "Máximo de 80 caracteres"),
  descricao: z.string().trim().max(300, "Máximo de 300 caracteres"),
  preco: z
    .string()
    .transform((texto) => parseReais(texto))
    .refine((c): c is number => c !== null && c > 0, "Preço inválido (ex.: 25,90)"),
  disponivel: z.boolean(),
});

export async function salvarItem(
  db: Db,
  entrada: { id?: number | string; categoriaId: number | string; nome: string; descricao: string; preco: string; disponivel: boolean },
  agora: Relogio,
): Promise<ResultadoAcao> {
  const v = esquemaItem.safeParse(entrada);
  const campos = v.success ? {} : camposComErro(v.error);
  if (!campos.categoriaId) {
    const categoria = await db.query.categorias.findFirst({ where: eq(categorias.id, Number(entrada.categoriaId)) });
    if (!categoria) campos.categoriaId = "Categoria não encontrada";
  }
  if (!v.success || Object.keys(campos).length) return falhaValidacao(campos);

  const { id, categoriaId, nome, descricao, preco, disponivel } = v.data;
  const dados = { categoriaId, nome, descricao, precoCentavos: preco, disponivel, atualizadoEm: agora() };
  try {
    if (id) await db.update(itensCardapio).set(dados).where(eq(itensCardapio.id, id));
    else await db.insert(itensCardapio).values({ ...dados, criadoEm: agora() });
    return { ok: true, mensagem: `Item “${nome}” salvo.` };
  } catch (e) {
    if (ehViolacaoUnica(e)) {
      return { ok: false, erro: "Já existe um item com esse nome nesta categoria.", campos: { nome: "Nome repetido" } };
    }
    throw e;
  }
}

export async function excluirItem(db: Db, id: number): Promise<ResultadoAcao> {
  // itens_pedido.item_cardapio_id é "on delete set null": pedidos antigos mantêm o snapshot.
  const removidos = await db.delete(itensCardapio).where(eq(itensCardapio.id, id)).returning({ id: itensCardapio.id });
  return removidos.length ? { ok: true, mensagem: "Item excluído." } : { ok: false, erro: "Item não encontrado." };
}

export async function alternarDisponibilidade(db: Db, id: number, disponivel: boolean, agora: Relogio): Promise<ResultadoAcao> {
  const alterados = await db
    .update(itensCardapio)
    .set({ disponivel, atualizadoEm: agora() })
    .where(eq(itensCardapio.id, id))
    .returning({ nome: itensCardapio.nome });
  if (!alterados.length) return { ok: false, erro: "Item não encontrado." };
  return { ok: true, mensagem: `${alterados[0].nome} ${disponivel ? "disponível" : "indisponível"}.` };
}
