import { categorias, configuracoes, itensCardapio } from "./schema";
import type { Db } from "./client";

// Restaurante demo da PoC (specs/001-fundacao/data-model.md#seed-demo-burger-demo).

const CONFIG = {
  id: 1,
  nome: "Burger Demo",
  lojaAberta: true,
  taxaEntregaCentavos: 500,
  tempoEstimado: "40–50 min",
  horario: "Todos os dias, 18h às 23h",
  aceitaRetirada: true,
  enderecoRetirada: "Rua Exemplo, 123 – Centro",
};

const CARDAPIO: { categoria: string; ordem: number; itens: [nome: string, preco: number, descricao: string][] }[] = [
  {
    categoria: "Lanches",
    ordem: 1,
    itens: [
      ["X-Burguer", 2590, "Pão brioche, hambúrguer 150g, queijo prato"],
      ["X-Salada", 2790, "Hambúrguer 150g, queijo, alface, tomate e maionese da casa"],
      ["X-Bacon", 3190, "Hambúrguer 150g, queijo, bacon crocante e cebola caramelizada"],
      ["Smash Duplo", 3490, "Dois smash de 90g, cheddar duplo e picles"],
    ],
  },
  {
    categoria: "Porções",
    ordem: 2,
    itens: [
      ["Batata Frita P", 1490, "Porção individual, 200g"],
      ["Batata Cheddar e Bacon", 2490, "400g com cheddar cremoso e bacon"],
      ["Onion Rings", 1990, "Anéis de cebola empanados, 12 unidades"],
    ],
  },
  {
    categoria: "Bebidas",
    ordem: 3,
    itens: [
      ["Coca-Cola Lata", 650, "350ml"],
      ["Guaraná Lata", 600, "350ml"],
      ["Suco Natural", 990, "Laranja ou limão, 500ml"],
      ["Água sem Gás", 400, "500ml"],
    ],
  },
  {
    categoria: "Sobremesas",
    ordem: 4,
    itens: [
      ["Brownie", 1290, "Brownie de chocolate meio amargo"],
      ["Milkshake de Chocolate", 1890, "400ml"],
    ],
  },
];

/** Idempotente: insere só o que falta e nunca sobrescreve edições feitas no admin. */
export async function seedDemo(db: Db): Promise<void> {
  await db.insert(configuracoes).values(CONFIG).onConflictDoNothing();

  for (const { categoria, ordem, itens } of CARDAPIO) {
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
