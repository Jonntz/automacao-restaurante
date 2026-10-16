import { exigirApiKey } from "@/lib/bot/autenticacao";
import { getDepsBot } from "@/lib/bot/deps";
import { responder } from "@/lib/bot/respostas";
import { servicoContexto } from "@/lib/bot/servico";

// GET /api/bot/contexto?telefone= — contrato em specs/004-api-do-bot/contracts/api-bot.md
export async function GET(request: Request) {
  const negado = exigirApiKey(request);
  if (negado) return negado;
  const telefone = new URL(request.url).searchParams.get("telefone") ?? "";
  return responder(async () => servicoContexto(await getDepsBot(), telefone));
}
