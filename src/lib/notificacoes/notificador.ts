import { lerEnvN8n } from "@/lib/env";
import type { DestinoNotificacao, Notificador } from "@/lib/pedidos/tipos";

type Log = { warn: (mensagem: string) => void };

/** Mostra só o final do telefone nos logs. */
export const mascararTelefone = (telefone: string) =>
  telefone.length > 4 ? `***${telefone.slice(-4)}` : "***";

export const notificadorNulo: Notificador = {
  async notificar() {},
};

/** Envia a mensagem ao cliente pelo workflow "Notificar Cliente" do n8n. Nunca lança (PED-RF-19). */
export function criarNotificadorN8n({
  n8nUrl,
  segredo,
  fetch = globalThis.fetch,
  log = console,
  timeoutMs = 5000,
}: {
  n8nUrl: string;
  segredo: string;
  fetch?: typeof globalThis.fetch;
  log?: Log;
  timeoutMs?: number;
}): Notificador {
  const url = `${n8nUrl.replace(/\/+$/, "")}/webhook/notificar-cliente`;
  return {
    async notificar(destino: DestinoNotificacao, mensagem: string) {
      if (destino.canal === "teste") return;
      const quem = mascararTelefone(destino.telefone);
      try {
        const resposta = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-webhook-secret": segredo },
          body: JSON.stringify({ telefone: destino.telefone, mensagem }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!resposta.ok) log.warn(`[notificador] n8n respondeu HTTP ${resposta.status} ao notificar ${quem}`);
      } catch (erro) {
        const motivo = erro instanceof Error ? erro.name : "erro desconhecido";
        log.warn(`[notificador] falha ao notificar ${quem}: ${motivo}`);
      }
    },
  };
}

let avisouSemN8n = false;

/** Notificador da aplicação: HTTP para o n8n se configurado, senão nulo (PED-RF-20). */
export function getNotificador(): Notificador {
  try {
    const { N8N_URL, N8N_WEBHOOK_SECRET } = lerEnvN8n();
    return criarNotificadorN8n({ n8nUrl: N8N_URL, segredo: N8N_WEBHOOK_SECRET });
  } catch (erro) {
    if (!avisouSemN8n) {
      avisouSemN8n = true;
      console.warn(`[notificador] notificações desligadas: ${(erro as Error).message}`);
    }
    return notificadorNulo;
  }
}
