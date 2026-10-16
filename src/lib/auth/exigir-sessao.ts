import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lerEnvAdmin } from "@/lib/env";
import { NOME_COOKIE_SESSAO, verificarTokenSessao } from "./sessao";

/** Lê e valida o cookie de sessão; null se ausente/inválido. */
export async function obterSessao(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(NOME_COOKIE_SESSAO)?.value;
  return verificarTokenSessao(token, lerEnvAdmin().SESSION_SECRET);
}

/** Defesa em profundidade: toda server action do admin chama isto (ADM-RF-03). */
export async function exigirSessao(): Promise<{ email: string }> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  return sessao;
}
