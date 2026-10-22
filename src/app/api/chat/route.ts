import ids from "../../../../n8n/ids.json";
import { encaminharChat } from "@/lib/chat/proxy";
import { MENSAGEM_INDISPONIVEL } from "@/lib/chat/textos";
import { lerEnvN8n } from "@/lib/env";

// Proxy público do chat web (specs/011-demo-publica DEM-RF-02): /chat → aqui → Chat Teste do n8n.
export async function POST(request: Request) {
  let n8n: ReturnType<typeof lerEnvN8n>;
  try {
    n8n = lerEnvN8n();
  } catch (erro) {
    console.error(`[chat] n8n não configurado: ${(erro as Error).message}`);
    return Response.json({ output: MENSAGEM_INDISPONIVEL });
  }
  const { status, corpo } = await encaminharChat(await request.text(), {
    n8nUrl: n8n.N8N_URL,
    segredo: n8n.N8N_WEBHOOK_SECRET,
    webhookId: ids.chatTesteWebhookId,
  });
  return Response.json(corpo, { status });
}
