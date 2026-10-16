"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validarCredenciais } from "@/lib/auth/credenciais";
import { criarTokenSessao, DURACAO_SESSAO_SEGUNDOS, NOME_COOKIE_SESSAO } from "@/lib/auth/sessao";
import { lerEnvAdmin } from "@/lib/env";

/** `email` volta no estado para o reset automático do formulário (React 19) não apagar o campo. */
export type EstadoLogin = { erro: string | null; email: string };

/** Só redireciona para dentro do painel (evita open redirect). */
const destinoSeguro = (de: FormDataEntryValue | null) => {
  const caminho = typeof de === "string" ? de : "";
  return /^\/admin(\/[\w\-/]*)?$/.test(caminho) ? caminho : "/admin/pedidos";
};

export async function entrar(_anterior: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "");
  const senha = String(form.get("senha") ?? "");
  if (!validarCredenciais(email, senha)) return { erro: "E-mail ou senha inválidos", email };

  const token = await criarTokenSessao(email.trim().toLowerCase(), lerEnvAdmin().SESSION_SECRET);
  (await cookies()).set(NOME_COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect(destinoSeguro(form.get("de")));
}

export async function sair() {
  (await cookies()).delete(NOME_COOKIE_SESSAO);
  redirect("/login");
}
