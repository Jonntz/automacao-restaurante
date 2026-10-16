import { exigirApiKey } from "@/lib/bot/autenticacao";
import { getDepsBot } from "@/lib/bot/deps";
import { lerCorpoJson, responder } from "@/lib/bot/respostas";
import { servicoRevisar } from "@/lib/bot/servico";

// POST /api/bot/pedidos/revisar — orçamento sem gravar (BOT-RF-03)
export async function POST(request: Request) {
  const negado = exigirApiKey(request);
  if (negado) return negado;
  const leitura = await lerCorpoJson(request);
  if ("resposta" in leitura) return leitura.resposta;
  return responder(async () => servicoRevisar(await getDepsBot(), leitura.corpo));
}
