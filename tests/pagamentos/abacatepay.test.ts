import { describe, expect, it, vi } from "vitest";
import { criarProvedorAbacatePay, mapearStatusAbacatePay } from "@/lib/pagamentos/abacatepay";
import { ErroProvedorPagamento } from "@/lib/pagamentos/tipos";

const BASE = "https://api.abacatepay.com/v2";
const entrada = { pedidoId: 13, valorCentavos: 4990, descricao: "Pedido #0013 - Burger Demo", expiraEmSegundos: 1800 };

const respostaCriacao = {
  data: {
    id: "pix_char_123",
    amount: 4990,
    status: "PENDING",
    devMode: true,
    brCode: "00020101021226950014br.gov.bcb.pix6304ABCD",
    brCodeBase64: "data:image/png;base64,iVBOR",
    platformFee: 80,
    createdAt: "2026-10-16T21:00:00.000Z",
    updatedAt: "2026-10-16T21:00:00.000Z",
    expiresAt: "2026-10-16T21:30:00.000Z",
    metadata: { pedidoId: 13 },
  },
  error: null,
  success: true,
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "content-type": "application/json" } });

function provedor(fetch: typeof globalThis.fetch, extra: Partial<Parameters<typeof criarProvedorAbacatePay>[0]> = {}) {
  return criarProvedorAbacatePay({ apiKey: "abc_dev_chave", fetch, ...extra });
}

describe("AbacatePay — criarCobranca (PAG-RF-04, CA-03)", () => {
  it("envia method PIX, amount = total, expiresIn 1800, externalId e Bearer", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(respostaCriacao));
    const c = await provedor(fetch).criarCobranca(entrada);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/transparents/create`);
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toBe("Bearer abc_dev_chave");
    expect(headers.get("content-type")).toBe("application/json");
    const corpo = JSON.parse(String(init?.body));
    expect(corpo).toMatchObject({
      method: "PIX",
      data: { amount: 4990, expiresIn: 1800, description: "Pedido #0013 - Burger Demo", metadata: { pedidoId: 13 } },
    });
    expect(corpo.data.externalId).toMatch(/^pedido-13-\d+$/);

    expect(c).toEqual({
      provedorId: "pix_char_123",
      copiaECola: respostaCriacao.data.brCode,
      qrCodeBase64: respostaCriacao.data.brCodeBase64,
      expiraEm: new Date("2026-10-16T21:30:00.000Z"),
      status: "pendente",
    });
  });

  it("CA-04: 401 vira ErroProvedorPagamento com a mensagem do provedor", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ error: "Token inválido" }, 401));
    await expect(provedor(fetch).criarCobranca(entrada)).rejects.toThrow(ErroProvedorPagamento);
    await expect(provedor(fetch).criarCobranca(entrada)).rejects.toThrow(/Token inválido/);
  });

  it("CA-04: success false vira erro", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json({ data: null, error: "Valor mínimo", success: false }));
    await expect(provedor(fetch).criarCobranca(entrada)).rejects.toThrow(/Valor mínimo/);
  });

  it("timeout vira erro do provedor", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_u, init) => new Promise((_r, rej) => init?.signal?.addEventListener("abort", () => rej(init.signal?.reason))),
    );
    await expect(provedor(fetch, { timeoutMs: 10 }).criarCobranca(entrada)).rejects.toThrow(ErroProvedorPagamento);
  });
});

describe("AbacatePay — check e simulate (PAG-RF-04)", () => {
  it("consultarStatus faz GET /transparents/check?id= e mapeia", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(json({ data: { id: "pix_char_1", status: "PAID" }, error: null, success: true }));
    expect(await provedor(fetch).consultarStatus("pix_char_1")).toBe("pago");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/transparents/check?id=pix_char_1`);
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("simularPagamento faz POST /transparents/simulate-payment?id=", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(json(respostaCriacao));
    await provedor(fetch).simularPagamento!("pix_char_1");
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/transparents/simulate-payment?id=pix_char_1`);
    expect(init?.method).toBe("POST");
  });

  it("permiteSimulacao segue o devMode configurado", () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    expect(provedor(fetch).permiteSimulacao).toBe(true);
    expect(provedor(fetch, { devMode: false }).permiteSimulacao).toBe(false);
  });
});

describe("mapearStatusAbacatePay", () => {
  it.each([
    ["PAID", "pago"],
    ["APPROVED", "pago"],
    ["EXPIRED", "expirado"],
    ["CANCELLED", "cancelado"],
    ["REFUNDED", "cancelado"],
    ["FAILED", "cancelado"],
    ["PENDING", "pendente"],
    ["UNDER_DISPUTE", "pendente"],
    [undefined, "pendente"],
  ])("%s → %s", (entrada, esperado) => {
    expect(mapearStatusAbacatePay(entrada)).toBe(esperado);
  });
});
