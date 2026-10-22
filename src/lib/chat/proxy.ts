import { z } from "zod";
import { LIMITE_MENSAGEM, MENSAGEM_INDISPONIVEL, MENSAGEM_LONGA } from "./textos";

// Proxy do chat web (/chat → /api/chat → Chat Teste do n8n), specs/011-demo-publica DEM-RF-02.
// Falhas do n8n viram uma mensagem do atendente: a página mostra o `output` como fala do bot.

const sessionId = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const entrada = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sendMessage"), sessionId, chatInput: z.string().trim().min(1) }),
  z.object({ action: z.literal("loadPreviousSession"), sessionId }),
]);

export type RespostaChat = { status: number; corpo: { output: string } | { data: [] } | { erro: string } };

export async function encaminharChat(
  corpoBruto: string,
  {
    n8nUrl,
    segredo,
    webhookId,
    fetch = globalThis.fetch,
    log = console,
    timeoutMs = 60_000,
  }: {
    n8nUrl: string;
    segredo: string;
    webhookId: string;
    fetch?: typeof globalThis.fetch;
    log?: { warn: (m: string) => void };
    timeoutMs?: number;
  },
): Promise<RespostaChat> {
  let json: unknown;
  try {
    json = JSON.parse(corpoBruto);
  } catch {
    return { status: 400, corpo: { erro: "JSON inválido" } };
  }
  const lido = entrada.safeParse(json);
  if (!lido.success) return { status: 400, corpo: { erro: "Requisição inválida" } };
  // O widget roda com loadPreviousSession: false; responder vazio evita um erro se ele pedir mesmo assim.
  if (lido.data.action === "loadPreviousSession") return { status: 200, corpo: { data: [] } };

  const { action, sessionId: sessao, chatInput } = lido.data;
  if (chatInput.length > LIMITE_MENSAGEM) return { status: 200, corpo: { output: MENSAGEM_LONGA } };

  try {
    const resposta = await fetch(`${n8nUrl.replace(/\/+$/, "")}/webhook/${webhookId}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": segredo },
      body: JSON.stringify({ action, sessionId: sessao, chatInput }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resposta.ok) throw new Error(`n8n respondeu HTTP ${resposta.status}`);
    const { output } = (await resposta.json()) as { output?: unknown };
    if (typeof output !== "string" || !output.trim()) throw new Error("n8n respondeu sem output");
    return { status: 200, corpo: { output } };
  } catch (erro) {
    const { name, message } = erro as Error;
    log.warn(`[chat] falha ao falar com o atendente (sessão ${sessao.slice(0, 8)}…): ${name}: ${message}`);
    return { status: 200, corpo: { output: MENSAGEM_INDISPONIVEL } };
  }
}
