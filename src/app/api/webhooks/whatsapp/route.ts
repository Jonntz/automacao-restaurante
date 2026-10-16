import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { lerEnvN8n, lerEnvWhatsapp } from "@/lib/env";
import { compararSegredo } from "@/lib/seguranca";
import { encaminharParaN8n } from "@/lib/whatsapp/encaminhar";
import { processarWebhookWhatsapp } from "@/lib/whatsapp/gateway";

// Gateway do webhook da WhatsApp Cloud API (ADR-03, specs/008-whatsapp).

function envWhatsapp() {
  try {
    return lerEnvWhatsapp();
  } catch (erro) {
    console.error(`[whatsapp] ${(erro as Error).message}`);
    return null;
  }
}

/** Verificação do webhook pela Meta (WPP-RF-01). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const env = envWhatsapp();
  if (!env) return new Response("WhatsApp não configurado", { status: 503 });
  if (params.get("hub.mode") === "subscribe" && compararSegredo(params.get("hub.verify_token"), env.WHATSAPP_VERIFY_TOKEN)) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Mensagens recebidas: valida, deduplica, responde 200 e encaminha ao n8n depois (WPP-RF-02…08). */
export async function POST(request: Request) {
  const corpoBruto = await request.text();
  const env = envWhatsapp();
  if (!env) return Response.json({ ok: false, erro: "WhatsApp não configurado" }, { status: 503 });

  const resultado = await processarWebhookWhatsapp(
    await getDb(),
    { corpoBruto, assinatura: request.headers.get("x-hub-signature-256") },
    { appSecret: env.WHATSAPP_APP_SECRET, agora: () => new Date() },
  );

  if (resultado.encaminhar.length) {
    let n8n: ReturnType<typeof lerEnvN8n> | null = null;
    try {
      n8n = lerEnvN8n();
    } catch (erro) {
      console.error(`[whatsapp] mensagens recebidas, mas o n8n não está configurado: ${(erro as Error).message}`);
    }
    if (n8n) {
      const { N8N_URL, N8N_WEBHOOK_SECRET } = n8n;
      after(() => encaminharParaN8n(resultado.encaminhar, { n8nUrl: N8N_URL, segredo: N8N_WEBHOOK_SECRET }));
    }
  }
  return Response.json(resultado.corpo, { status: resultado.status });
}
