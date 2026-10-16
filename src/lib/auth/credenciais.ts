import { lerEnvAdmin } from "@/lib/env";
import { compararSegredo } from "@/lib/seguranca";

type EnvAdmin = { ADMIN_EMAIL: string; ADMIN_PASSWORD: string };

/** Compara e-mail e senha em tempo constante; as duas comparações sempre rodam (ADM-RF-01). */
export function validarCredenciais(email: string, senha: string, env: EnvAdmin = lerEnvAdmin()): boolean {
  const emailOk = compararSegredo(email.trim().toLowerCase(), env.ADMIN_EMAIL.trim().toLowerCase());
  const senhaOk = compararSegredo(senha, env.ADMIN_PASSWORD);
  return emailOk && senhaOk;
}
