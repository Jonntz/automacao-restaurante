import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarDbTeste } from "../helpers/db";

vi.mock("@/lib/db/client", async (original) => ({
  ...(await original<typeof import("@/lib/db/client")>()),
  getDb: () => criarDbTeste(),
}));

const { POST } = await import("@/app/api/webhooks/abacatepay/route");

const requisicao = (segredo: string, corpo: unknown) =>
  new Request(`http://localhost/api/webhooks/abacatepay?webhookSecret=${segredo}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corpo),
  });

describe("POST /api/webhooks/abacatepay (PAG-RF-12)", () => {
  beforeEach(() => {
    vi.stubEnv("ABACATEPAY_WEBHOOK_SECRET", "segredo-da-rota");
    vi.stubEnv("PAGAMENTO_PROVEDOR", "mock");
  });

  it("segredo errado → 401", async () => {
    const r = await POST(requisicao("errado", { id: "log_1", event: "transparent.completed", data: {} }));
    expect(r.status).toBe(401);
  });

  it("segredo certo e cobrança desconhecida → 200 ignorado", async () => {
    const r = await POST(requisicao("segredo-da-rota", { id: "log_1", event: "transparent.completed", data: { id: "x" } }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, ignorado: true });
  });
});
