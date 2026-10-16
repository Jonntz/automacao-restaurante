"use server";

import { refresh } from "next/cache";
import {
  alternarDisponibilidade,
  excluirCategoria,
  excluirItem,
  salvarCategoria,
  salvarItem,
  type ResultadoAcao,
} from "@/lib/admin/cardapio";
import { exigirSessao } from "@/lib/auth/exigir-sessao";
import { getDb } from "@/lib/db/client";

// Ações do cardápio (ADM-RF-13…17): sessão → FormData → domínio → refresh.

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "");
const idOpcional = (form: FormData) => texto(form, "id") || undefined;
const agora = () => new Date();

async function concluir(resultado: Promise<ResultadoAcao>): Promise<ResultadoAcao> {
  const r = await resultado;
  if (r.ok) refresh();
  return r;
}

export async function salvarItemAcao(_anterior: ResultadoAcao | null, form: FormData): Promise<ResultadoAcao> {
  await exigirSessao();
  return concluir(
    salvarItem(
      await getDb(),
      {
        id: idOpcional(form),
        categoriaId: texto(form, "categoriaId"),
        nome: texto(form, "nome"),
        descricao: texto(form, "descricao"),
        preco: texto(form, "preco"),
        disponivel: form.get("disponivel") === "on",
      },
      agora,
    ),
  );
}

export async function salvarCategoriaAcao(_anterior: ResultadoAcao | null, form: FormData): Promise<ResultadoAcao> {
  await exigirSessao();
  return concluir(salvarCategoria(await getDb(), { id: idOpcional(form), nome: texto(form, "nome"), ordem: texto(form, "ordem") }));
}

export async function excluirItemAcao(id: number): Promise<ResultadoAcao> {
  await exigirSessao();
  return concluir(excluirItem(await getDb(), id));
}

export async function excluirCategoriaAcao(id: number): Promise<ResultadoAcao> {
  await exigirSessao();
  return concluir(excluirCategoria(await getDb(), id));
}

export async function alternarDisponibilidadeAcao(id: number, disponivel: boolean): Promise<ResultadoAcao> {
  await exigirSessao();
  return concluir(alternarDisponibilidade(await getDb(), id, disponivel === true, agora));
}
