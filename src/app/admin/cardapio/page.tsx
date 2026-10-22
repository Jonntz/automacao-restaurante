import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { categorias, itensCardapio } from "@/lib/db/schema";
import { GerenciadorCardapio } from "./gerenciador";

export const metadata: Metadata = { title: "Cardápio — Painel Container Lanches" };

async function Conteudo() {
  await connection();
  const db = await getDb();
  const lista = await db.query.categorias.findMany({
    orderBy: [asc(categorias.ordem), asc(categorias.id)],
    with: { itens: { orderBy: [asc(itensCardapio.id)] } },
  });
  return <GerenciadorCardapio categorias={lista} />;
}

export default function PaginaCardapio() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl uppercase">Cardápio</h1>
        <p className="text-sm text-muted-foreground">O número (#id) é o que a IA usa para montar os pedidos.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando cardápio…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}
