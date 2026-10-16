import { mascararTelefone } from "@/lib/notificacoes/notificador";
import type { MensagemNormalizada } from "./parse";

/** Envia cada mensagem, em ordem, ao workflow "WhatsApp Entrada" do n8n. Nunca lança (WPP-RF-07). */
export async function encaminharParaN8n(
  mensagens: MensagemNormalizada[],
  {
    n8nUrl,
    segredo,
    fetch = globalThis.fetch,
    log = console,
    timeoutMs = 10_000,
  }: {
    n8nUrl: string;
    segredo: string;
    fetch?: typeof globalThis.fetch;
    log?: { warn: (m: string) => void };
    timeoutMs?: number;
  },
): Promise<void> {
  const url = `${n8nUrl.replace(/\/+$/, "")}/webhook/whatsapp-entrada`;
  for (const { telefone, nome, tipo, texto, messageId } of mensagens) {
    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-webhook-secret": segredo },
        body: JSON.stringify({ telefone, nome, tipo, texto, messageId }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!resposta.ok) log.warn(`[whatsapp] n8n respondeu HTTP ${resposta.status} para ${mascararTelefone(telefone)}`);
    } catch (erro) {
      log.warn(`[whatsapp] falha ao encaminhar ${messageId} de ${mascararTelefone(telefone)}: ${(erro as Error).name}`);
    }
  }
}
