import { lerEnvBot } from "@/lib/env";
import { compararSegredo } from "@/lib/seguranca";

/** Devolve a resposta de erro (401/503) ou null quando o x-api-key confere (BOT-RF-01). */
export function exigirApiKey(
  request: Request,
  fonte: Record<string, string | undefined> = process.env,
): Response | null {
  let chave: string;
  try {
    chave = lerEnvBot(fonte).BOT_API_KEY;
  } catch (erro) {
    console.error(`[api do bot] ${(erro as Error).message}`);
    return Response.json({ ok: false, erro: "API do bot não configurada" }, { status: 503 });
  }
  if (!compararSegredo(request.headers.get("x-api-key"), chave)) {
    return Response.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }
  return null;
}
