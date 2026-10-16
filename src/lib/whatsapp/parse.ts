// Extrai mensagens do webhook da Cloud API da Meta (WPP-RF-03…05).

export type MensagemNormalizada = {
  telefone: string;
  nome: string | null;
  tipo: "texto" | "outro";
  texto: string | null;
  messageId: string;
  /** Instante da mensagem em ms. */
  timestamp: number;
};

/** A Meta reentrega mensagens antigas após quedas; não respondemos a elas. */
export const IDADE_MAXIMA_MS = 10 * 60_000;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function extrairMensagens(payload: unknown, agora: Date): MensagemNormalizada[] {
  const raiz = obj(payload);
  if (raiz?.object !== "whatsapp_business_account") return [];

  const mensagens: MensagemNormalizada[] = [];
  for (const entrada of lista(raiz.entry)) {
    for (const mudanca of lista(obj(entrada)?.changes)) {
      const m = obj(mudanca);
      if (m?.field !== "messages") continue;
      const valor = obj(m.value);
      const nomes = new Map(
        lista(valor?.contacts).map((c) => [String(obj(c)?.wa_id), String(obj(obj(c)?.profile)?.name ?? "") || null]),
      );
      for (const bruta of lista(valor?.messages)) {
        const msg = obj(bruta);
        const telefone = typeof msg?.from === "string" ? msg.from : null;
        const messageId = typeof msg?.id === "string" ? msg.id : null;
        const timestamp = Number(msg?.timestamp) * 1000;
        if (!msg || !telefone || !messageId || !Number.isFinite(timestamp)) continue;
        if (agora.getTime() - timestamp > IDADE_MAXIMA_MS) continue;

        const ehTexto = msg.type === "text";
        mensagens.push({
          telefone,
          nome: nomes.get(telefone) ?? null,
          tipo: ehTexto ? "texto" : "outro",
          texto: ehTexto ? String(obj(msg.text)?.body ?? "") : null,
          messageId,
          timestamp,
        });
      }
    }
  }
  return mensagens;
}
