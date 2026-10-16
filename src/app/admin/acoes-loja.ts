"use server";

import { refresh } from "next/cache";
import { definirLojaAberta } from "@/lib/admin/loja";
import type { ResultadoAcao } from "@/lib/admin/cardapio";
import { exigirSessao } from "@/lib/auth/exigir-sessao";
import { getDb } from "@/lib/db/client";

export async function alternarLojaAcao(aberta: boolean): Promise<ResultadoAcao> {
  await exigirSessao();
  await definirLojaAberta(await getDb(), aberta === true, () => new Date());
  refresh();
  return { ok: true, mensagem: aberta ? "Loja aberta: o bot volta a aceitar pedidos." : "Loja fechada: o bot informa o horário." };
}
