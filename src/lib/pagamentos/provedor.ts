import { lerEnvPagamento } from "@/lib/env";
import { criarProvedorAbacatePay } from "./abacatepay";
import { criarProvedorMock } from "./mock";
import type { PagamentoProvedor } from "./tipos";

// Cache em globalThis: o estado do mock sobrevive ao hot reload do `next dev`.
const global = globalThis as unknown as { __provedorPagamento?: { chave: string; provedor: PagamentoProvedor } };

/** Provedor configurado por PAGAMENTO_PROVEDOR (padrão: mock) — PAG-RF-02. */
export function getProvedorPagamento(): PagamentoProvedor {
  const env = lerEnvPagamento();
  const chave = `${env.PAGAMENTO_PROVEDOR}:${env.ABACATEPAY_DEV_MODE}`;
  if (global.__provedorPagamento?.chave === chave) return global.__provedorPagamento.provedor;

  let provedor: PagamentoProvedor;
  if (env.PAGAMENTO_PROVEDOR === "abacatepay") {
    if (!env.ABACATEPAY_API_KEY) {
      throw new Error(
        "PAGAMENTO_PROVEDOR=abacatepay exige ABACATEPAY_API_KEY. Preencha no .env ou use PAGAMENTO_PROVEDOR=mock.",
      );
    }
    provedor = criarProvedorAbacatePay({ apiKey: env.ABACATEPAY_API_KEY, devMode: env.ABACATEPAY_DEV_MODE });
  } else {
    provedor = criarProvedorMock();
  }
  global.__provedorPagamento = { chave, provedor };
  return provedor;
}
