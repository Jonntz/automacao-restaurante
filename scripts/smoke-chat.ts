// Conversa roteirizada com o agente pelo Chat Teste do n8n (IA-RF-09).
// Pré-requisitos: `pnpm dev`, `pnpm infra:up` e GEMINI_API_KEY no .env. Uso: pnpm smoke
// É um teste MANUAL: a resposta do LLM não é determinística.
import fs from "node:fs";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const ids = JSON.parse(fs.readFileSync("n8n/ids.json", "utf8")) as { chatTesteWebhookId: string };
const N8N = process.env.N8N_URL ?? "http://localhost:5678";
const APP = process.env.APP_URL ?? "http://localhost:3000";
const sessionId = `smoke-${Date.now()}`;
const ROTEIRO = [
  "oi, o que vocês têm de lanche?",
  "quero 2 x-burguer e 1 coca lata para retirada, meu nome é Teste Smoke",
  "sim, pode confirmar",
];
// Free tier do Gemini tem poucas requisições por minuto: espaçamos as mensagens.
const PAUSA_MS = 4000;

async function falar(chatInput: string): Promise<string> {
  const resposta = await fetch(`${N8N}/webhook/${ids.chatTesteWebhookId}/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "sendMessage", sessionId, chatInput }),
  });
  if (!resposta.ok) throw new Error(`n8n respondeu HTTP ${resposta.status}: ${await resposta.text()}`);
  const corpo = (await resposta.json()) as { output?: string; text?: string };
  return corpo.output ?? corpo.text ?? JSON.stringify(corpo);
}

async function main() {
  console.log(`Sessão ${sessionId}\n`);
  for (const mensagem of ROTEIRO) {
    console.log(`🧑 ${mensagem}`);
    console.log(`🤖 ${(await falar(mensagem)).replace(/\n/g, "\n   ")}\n`);
    await new Promise((r) => setTimeout(r, PAUSA_MS));
  }

  const telefone = encodeURIComponent(`teste:${sessionId}`);
  const r = await fetch(`${APP}/api/bot/pedidos?telefone=${telefone}`, {
    headers: { "x-api-key": process.env.BOT_API_KEY ?? "" },
  });
  const { pedidos = [] } = (await r.json()) as { pedidos?: { numero: string; total: string; statusTexto: string }[] };
  if (!pedidos.length) {
    console.error("❌ Nenhum pedido criado nesta conversa (o LLM pode ter pedido mais informações — rode de novo ou converse pelo Chat Teste).");
    process.exit(1);
  }
  console.log(`✅ Pedido ${pedidos[0].numero} (${pedidos[0].total}) — ${pedidos[0].statusTexto}. Veja em ${APP}/admin/pedidos`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
