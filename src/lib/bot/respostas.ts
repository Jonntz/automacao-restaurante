import { EXEMPLO_CORPO } from "./entrada";
import type { RespostaBot } from "./servico";

/** Executa o serviço e converte em Response; erro inesperado vira 500 sem stack (BOT-RF-09). */
export async function responder(executar: () => Promise<RespostaBot>): Promise<Response> {
  try {
    const { status, corpo } = await executar();
    return Response.json(corpo, { status });
  } catch (erro) {
    console.error("[api do bot] erro interno:", erro instanceof Error ? erro.stack : erro);
    return Response.json({ ok: false, erro: "Erro interno, tente novamente." }, { status: 500 });
  }
}

const JSON_INVALIDO = Symbol("json-invalido");

/** Lê o corpo JSON; devolve a resposta 400 pronta se não for JSON válido (BOT-RF-08). */
export async function lerCorpoJson(request: Request): Promise<{ corpo: unknown } | { resposta: Response }> {
  const corpo: unknown = await request.json().catch(() => JSON_INVALIDO);
  if (corpo === JSON_INVALIDO) {
    return {
      resposta: Response.json(
        {
          ok: false,
          codigo: "FORMATO_INVALIDO",
          erros: [`O corpo da requisição não é um JSON válido. Exemplo: ${EXEMPLO_CORPO}`],
        },
        { status: 400 },
      ),
    };
  }
  return { corpo };
}
