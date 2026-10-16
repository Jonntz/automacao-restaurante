import { exigirApiKey } from "@/lib/bot/autenticacao";
import { getDepsBot } from "@/lib/bot/deps";
import { lerCorpoJson, responder } from "@/lib/bot/respostas";
import { servicoCriar, servicoListar } from "@/lib/bot/servico";

// POST cria pedido + Pix | GET ?telefone= lista — contrato em specs/004-api-do-bot/contracts/api-bot.md
export async function POST(request: Request) {
  const negado = exigirApiKey(request);
  if (negado) return negado;
  const leitura = await lerCorpoJson(request);
  if ("resposta" in leitura) return leitura.resposta;
  return responder(async () => servicoCriar(await getDepsBot(), leitura.corpo));
}

export async function GET(request: Request) {
  const negado = exigirApiKey(request);
  if (negado) return negado;
  const telefone = new URL(request.url).searchParams.get("telefone") ?? "";
  return responder(async () => servicoListar(await getDepsBot(), telefone));
}
