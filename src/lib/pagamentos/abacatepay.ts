import { ErroProvedorPagamento, type CobrancaCriada, type PagamentoProvedor, type StatusPagamento } from "./tipos";

// AbacatePay API v2 — https://docs.abacatepay.com (conferido em 2026-10-16, PAG-RF-04).

const BASE_URL = "https://api.abacatepay.com/v2";

type Envelope<T> = { data: T | null; error: string | null; success?: boolean };
type Transparente = {
  id: string;
  status?: string;
  brCode?: string;
  brCodeBase64?: string;
  expiresAt?: string;
};

export function mapearStatusAbacatePay(status: string | undefined): StatusPagamento {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "pago";
    case "EXPIRED":
      return "expirado";
    case "CANCELLED":
    case "REFUNDED":
    case "FAILED":
      return "cancelado";
    default:
      return "pendente";
  }
}

export function criarProvedorAbacatePay({
  apiKey,
  devMode = true,
  fetch = globalThis.fetch,
  baseUrl = BASE_URL,
  timeoutMs = 10_000,
}: {
  apiKey: string;
  devMode?: boolean;
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  timeoutMs?: number;
}): PagamentoProvedor {
  async function chamar<T>(metodo: "GET" | "POST", caminho: string, corpo?: unknown): Promise<T> {
    let resposta: Response;
    try {
      resposta = await fetch(`${baseUrl}${caminho}`, {
        method: metodo,
        headers: {
          authorization: `Bearer ${apiKey}`,
          ...(corpo === undefined ? {} : { "content-type": "application/json" }),
        },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (erro) {
      const motivo = erro instanceof Error && erro.name === "TimeoutError" ? "tempo esgotado" : "falha de rede";
      throw new ErroProvedorPagamento(`AbacatePay indisponível (${motivo}).`);
    }

    let envelope: Envelope<T> | null = null;
    try {
      envelope = (await resposta.json()) as Envelope<T>;
    } catch {
      // corpo não-JSON: tratado abaixo como erro
    }
    if (!resposta.ok || !envelope || envelope.success === false || !envelope.data) {
      const detalhe = envelope?.error ?? `HTTP ${resposta.status}`;
      throw new ErroProvedorPagamento(`AbacatePay recusou a operação: ${detalhe}`);
    }
    return envelope.data;
  }

  const comId = (caminho: string, id: string) => `${caminho}?id=${encodeURIComponent(id)}`;

  return {
    nome: "abacatepay",
    permiteSimulacao: devMode,

    async criarCobranca({ pedidoId, valorCentavos, descricao, expiraEmSegundos }): Promise<CobrancaCriada> {
      const dados = await chamar<Transparente>("POST", "/transparents/create", {
        method: "PIX",
        data: {
          amount: valorCentavos,
          expiresIn: expiraEmSegundos,
          description: descricao.slice(0, 500),
          externalId: `pedido-${pedidoId}-${Date.now()}`,
          metadata: { pedidoId },
        },
      });
      if (!dados.brCode || !dados.expiresAt) {
        throw new ErroProvedorPagamento("AbacatePay não devolveu o código Pix.");
      }
      return {
        provedorId: dados.id,
        copiaECola: dados.brCode,
        qrCodeBase64: dados.brCodeBase64 ?? null,
        expiraEm: new Date(dados.expiresAt),
        status: mapearStatusAbacatePay(dados.status),
      };
    },

    async consultarStatus(provedorId) {
      const dados = await chamar<Transparente>("GET", comId("/transparents/check", provedorId));
      return mapearStatusAbacatePay(dados.status);
    },

    async simularPagamento(provedorId) {
      await chamar<Transparente>("POST", comId("/transparents/simulate-payment", provedorId));
    },
  };
}
