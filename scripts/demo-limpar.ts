// Deixa o banco da demo pronto para uma nova apresentação (specs/011-demo-publica DEM-RF-11).
// Uso: pnpm demo:limpar          → só mostra o que seria apagado
//      pnpm demo:limpar --sim    → apaga pedidos/pagamentos/clientes, reabre a loja e religa os itens
import { sql } from "drizzle-orm";
import { criarDb } from "@/lib/db/client";
import { clientes, configuracoes, eventosProcessados, itensCardapio, itensPedido, pagamentos, pedidos } from "@/lib/db/schema";
import { lerEnvBanco } from "@/lib/env";

async function main() {
  const { DATABASE_URL, DATABASE_AUTH_TOKEN } = lerEnvBanco();
  const { db, client } = await criarDb(DATABASE_URL, DATABASE_AUTH_TOKEN);
  const destino = DATABASE_URL.split("?")[0];
  try {
    const contagem = {
      pedidos: await db.$count(pedidos),
      pagamentos: await db.$count(pagamentos),
      clientes: await db.$count(clientes),
    };
    console.log(`Banco: ${destino}`);
    console.log(`Encontrados: ${contagem.pedidos} pedidos, ${contagem.pagamentos} pagamentos, ${contagem.clientes} clientes.`);
    if (!process.argv.includes("--sim")) {
      console.log("Nada foi alterado. Para limpar de verdade: pnpm demo:limpar --sim");
      return;
    }
    // Ordem das foreign keys: filhos antes dos pais.
    await db.delete(itensPedido);
    await db.delete(pagamentos);
    await db.delete(pedidos);
    await db.delete(clientes);
    await db.delete(eventosProcessados);
    // Numeração volta a #0001 (só existe se alguma tabela usar AUTOINCREMENT).
    await db.run(sql`delete from sqlite_sequence where name in ('pedidos', 'itens_pedido', 'pagamentos', 'clientes')`).catch(() => {});
    await db.update(configuracoes).set({ lojaAberta: true });
    await db.update(itensCardapio).set({ disponivel: true });
    console.log("✔ Pedidos, pagamentos e clientes apagados; loja aberta e todos os itens disponíveis. Cardápio mantido.");
  } finally {
    client.close();
  }
}

main().catch((erro) => {
  console.error("✖", erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
