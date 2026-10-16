import { asc, eq } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { configuracoes, type Configuracao } from "@/lib/db/schema";

export type ItemDoCardapio = {
  id: number;
  nome: string;
  descricao: string;
  precoCentavos: number;
  disponivel?: boolean;
};

export type CategoriaDoCardapio = {
  id: number;
  nome: string;
  ordem: number;
  itens: ItemDoCardapio[];
};

/** Categorias em `ordem`, itens por `id`; categorias sem itens visíveis são omitidas (PED-RF-01). */
export async function obterCardapio(
  db: Db,
  { somenteDisponiveis }: { somenteDisponiveis: boolean },
): Promise<CategoriaDoCardapio[]> {
  const cats = await db.query.categorias.findMany({
    orderBy: (c) => [asc(c.ordem), asc(c.id)],
    with: {
      itens: {
        where: somenteDisponiveis ? (i, { eq }) => eq(i.disponivel, true) : undefined,
        orderBy: (i) => [asc(i.id)],
      },
    },
  });

  return cats
    .filter((c) => c.itens.length > 0)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      ordem: c.ordem,
      itens: c.itens.map((i) => ({
        id: i.id,
        nome: i.nome,
        descricao: i.descricao,
        precoCentavos: i.precoCentavos,
        disponivel: i.disponivel,
      })),
    }));
}

/** Configuração da loja (linha única, PED-RF-03). */
export async function obterConfiguracao(db: Db): Promise<Configuracao> {
  const [config] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (!config) throw new Error("Configuração da loja não encontrada. Rode `pnpm db:seed`.");
  return config;
}
