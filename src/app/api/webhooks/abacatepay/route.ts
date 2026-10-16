import { getDb } from "@/lib/db/client";
import { lerEnvPagamento } from "@/lib/env";
import { getNotificador } from "@/lib/notificacoes/notificador";
import { getProvedorPagamento } from "@/lib/pagamentos/provedor";
import { processarWebhookAbacatePay } from "@/lib/pagamentos/webhook";

// Casca HTTP fina: a lógica está em src/lib/pagamentos/webhook.ts (PAG-RF-12).
export async function POST(request: Request) {
  const segredoRecebido = new URL(request.url).searchParams.get("webhookSecret");
  const corpo: unknown = await request.json().catch(() => null);

  try {
    const { ABACATEPAY_WEBHOOK_SECRET } = lerEnvPagamento();
    const resultado = await processarWebhookAbacatePay(
      await getDb(),
      { segredoRecebido, corpo },
      {
        segredoEsperado: ABACATEPAY_WEBHOOK_SECRET,
        provedor: getProvedorPagamento(),
        notificador: getNotificador(),
        agora: () => new Date(),
      },
    );
    return Response.json(resultado.corpo, { status: resultado.status });
  } catch (erro) {
    console.error("[webhook abacatepay] erro interno:", erro instanceof Error ? erro.message : erro);
    return Response.json({ ok: false, erro: "Erro interno" }, { status: 500 });
  }
}
