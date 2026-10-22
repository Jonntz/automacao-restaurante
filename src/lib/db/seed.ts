import { categorias, configuracoes, itensCardapio } from "./schema";
import type { Db } from "./client";

// Seed do restaurante de demonstração (specs/010-marca-e-pizzaria/plan.md#seed-demo-container-lanches).
// Os testes de regra de negócio usam outro cardápio, fixo (tests/helpers/cardapio-teste.ts — MRC-RF-08).

export type DadosSeed = {
  config: {
    nome: string;
    taxaEntregaCentavos: number;
    tempoEstimado: string;
    horario: string;
    aceitaRetirada: boolean;
    enderecoRetirada: string;
  };
  categorias: { nome: string; ordem: number; itens: [nome: string, precoCentavos: number, descricao: string][] }[];
};

export const CARDAPIO_DEMO: DadosSeed = {
  config: {
    nome: "Container Lanches",
    taxaEntregaCentavos: 500,
    tempoEstimado: "40–50 min",
    horario: "Todos os dias, 18h às 23h30",
    aceitaRetirada: true,
    enderecoRetirada: "Rua Exemplo, 123 – Centro",
  },
  categorias: [
    {
      nome: "Pizzas Tradicionais — Grande, 8 fatias",
      ordem: 1,
      itens: [
        ["Mussarela", 4990, "Molho de tomate, mussarela e orégano"],
        ["Calabresa", 5290, "Calabresa fatiada, cebola, mussarela e orégano"],
        ["Margherita", 5490, "Mussarela, tomate, manjericão fresco e parmesão"],
        ["Portuguesa", 5890, "Presunto, ovos, cebola, ervilha, mussarela e azeitonas"],
        ["Frango com Catupiry", 5990, "Frango desfiado temperado e Catupiry original"],
        ["Quatro Queijos", 6290, "Mussarela, provolone, parmesão e Catupiry"],
      ],
    },
    {
      nome: "Pizzas Especiais — Grande, 8 fatias",
      ordem: 2,
      itens: [
        ["Container", 6990, "A da casa: calabresa, bacon, cheddar cremoso, cebola roxa e mussarela"],
        ["Pepperoni", 6690, "Pepperoni fatiado, mussarela e orégano"],
        ["Lombo com Catupiry", 6490, "Lombo canadense, Catupiry e mussarela"],
      ],
    },
    {
      nome: "Pizzas Doces — Broto, 4 fatias",
      ordem: 3,
      itens: [
        ["Chocolate com Morango", 3990, "Chocolate ao leite e morangos frescos"],
        ["Romeu e Julieta", 3690, "Goiabada cremosa e queijo"],
        ["Banana com Canela", 3490, "Banana, açúcar, canela e leite condensado"],
      ],
    },
    {
      nome: "Bordas Recheadas",
      ordem: 4,
      itens: [
        ["Borda de Catupiry", 990, "Adicional para uma pizza salgada"],
        ["Borda de Cheddar", 990, "Adicional para uma pizza salgada"],
        ["Borda de Chocolate", 1190, "Adicional para uma pizza doce"],
      ],
    },
    {
      nome: "Bebidas",
      ordem: 5,
      itens: [
        ["Coca-Cola 2 L", 1490, "Garrafa de 2 litros"],
        ["Guaraná Antarctica 2 L", 1290, "Garrafa de 2 litros"],
        ["Coca-Cola Lata", 650, "350ml"],
        ["Suco Natural", 990, "Laranja ou limão, 500ml"],
        ["Água sem Gás", 400, "500ml"],
      ],
    },
  ],
};

/** Idempotente: insere só o que falta e nunca sobrescreve edições feitas no admin. */
export async function aplicarSeed(db: Db, dados: DadosSeed): Promise<void> {
  await db
    .insert(configuracoes)
    .values({ id: 1, lojaAberta: true, ...dados.config })
    .onConflictDoNothing();

  for (const { nome: categoria, ordem, itens } of dados.categorias) {
    await db.insert(categorias).values({ nome: categoria, ordem }).onConflictDoNothing();
    const cat = await db.query.categorias.findFirst({ where: (c, { eq }) => eq(c.nome, categoria) });
    if (!cat) throw new Error(`Categoria ${categoria} não encontrada após o seed`);

    for (const [nome, precoCentavos, descricao] of itens) {
      await db
        .insert(itensCardapio)
        .values({ categoriaId: cat.id, nome, precoCentavos, descricao })
        .onConflictDoNothing();
    }
  }
}

export const seedDemo = (db: Db) => aplicarSeed(db, CARDAPIO_DEMO);
