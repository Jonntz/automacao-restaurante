import type { DadosSeed } from "@/lib/db/seed";

/**
 * Cardápio FIXO dos testes de regra de negócio (MRC-RF-08). Não muda junto com o seed demo:
 * os CAs de 002–005 (ex.: X-Burguer 25,90 ×2 = 5180) dependem destes valores e IDs.
 * IDs pela ordem de inserção: 1 X-Burguer, 2 X-Salada, 3 X-Bacon, 4 Smash Duplo, 5 Batata Frita P,
 * 6 Batata Cheddar e Bacon, 7 Onion Rings, 8 Coca-Cola Lata, 9 Guaraná Lata, 10 Suco Natural,
 * 11 Água sem Gás, 12 Brownie, 13 Milkshake de Chocolate.
 */
export const CARDAPIO_TESTE: DadosSeed = {
  config: {
    nome: "Burger Demo",
    taxaEntregaCentavos: 500,
    tempoEstimado: "40–50 min",
    horario: "Todos os dias, 18h às 23h",
    aceitaRetirada: true,
    enderecoRetirada: "Rua Exemplo, 123 – Centro",
  },
  categorias: [
    {
      nome: "Lanches",
      ordem: 1,
      itens: [
        ["X-Burguer", 2590, "Pão brioche, hambúrguer 150g, queijo prato"],
        ["X-Salada", 2790, "Hambúrguer 150g, queijo, alface, tomate e maionese da casa"],
        ["X-Bacon", 3190, "Hambúrguer 150g, queijo, bacon crocante e cebola caramelizada"],
        ["Smash Duplo", 3490, "Dois smash de 90g, cheddar duplo e picles"],
      ],
    },
    {
      nome: "Porções",
      ordem: 2,
      itens: [
        ["Batata Frita P", 1490, "Porção individual, 200g"],
        ["Batata Cheddar e Bacon", 2490, "400g com cheddar cremoso e bacon"],
        ["Onion Rings", 1990, "Anéis de cebola empanados, 12 unidades"],
      ],
    },
    {
      nome: "Bebidas",
      ordem: 3,
      itens: [
        ["Coca-Cola Lata", 650, "350ml"],
        ["Guaraná Lata", 600, "350ml"],
        ["Suco Natural", 990, "Laranja ou limão, 500ml"],
        ["Água sem Gás", 400, "500ml"],
      ],
    },
    {
      nome: "Sobremesas",
      ordem: 4,
      itens: [
        ["Brownie", 1290, "Brownie de chocolate meio amargo"],
        ["Milkshake de Chocolate", 1890, "400ml"],
      ],
    },
  ],
};
