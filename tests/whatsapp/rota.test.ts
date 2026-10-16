import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarDbTeste } from "../helpers/db";
import { APP_SECRET, assinar, payloadMeta } from "./helpers";

const db = criarDbTeste();
vi.mock("@/lib/db/client", async (original) => ({
  ...(await original<typeof import("@/lib/db/client")>()),
  getDb: () => db,
}));
const tarefas: Promise<unknown>[] = [];
vi.mock("next/server", async (original) => ({
  ...(await original<typeof import("next/server")>()),
  after: (fn: () => Promise<unknown>) => tarefas.push(fn()),
}));

const { GET, POST } = await import("@/app/api/webhooks/whatsapp/route");
const URL_BASE = "http://localhost/api/webhooks/whatsapp";

describe("rota /api/webhooks/whatsapp (CA-01…CA-03)", () => {
  let fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;
  beforeEach(() => {
    vi.stubEnv("WHATSAPP_VERIFY_TOKEN", "token-verificacao");
    vi.stubEnv("WHATSAPP_APP_SECRET", APP_SECRET);
    vi.stubEnv("N8N_URL", "http://n8n.local:5678");
    vi.stubEnv("N8N_WEBHOOK_SECRET", "segredo-interno-123");
    fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    tarefas.length = 0;
  });

  it("CA-01: GET com token certo devolve o challenge em texto", async () => {
    const r = await GET(new Request(`${URL_BASE}?hub.mode=subscribe&hub.verify_token=token-verificacao&hub.challenge=12345`));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("12345");
  });

  it("CA-01: GET com token errado → 403", async () => {
    const r = await GET(new Request(`${URL_BASE}?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=1`));
    expect(r.status).toBe(403);
  });

  it("CA-02: POST sem assinatura → 401 e nada encaminhado", async () => {
    const corpo = payloadMeta("texto", new Date());
    const r = await POST(new Request(URL_BASE, { method: "POST", body: corpo }));
    expect(r.status).toBe(401);
    expect(tarefas).toHaveLength(0);
  });

  it("CA-03: POST assinado → 200 e um encaminhamento ao n8n com o header secreto", async () => {
    const corpo = payloadMeta("texto", new Date()).replace("wamid.TEXTO1", `wamid.ROTA${Date.now()}`);
    const r = await POST(
      new Request(URL_BASE, { method: "POST", body: corpo, headers: { "x-hub-signature-256": assinar(corpo) } }),
    );
    expect(r.status).toBe(200);
    await Promise.all(tarefas);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://n8n.local:5678/webhook/whatsapp-entrada");
    expect(new Headers(init?.headers).get("x-webhook-secret")).toBe("segredo-interno-123");
    expect(JSON.parse(String(init?.body))).toMatchObject({ telefone: "5511999990000", tipo: "texto", texto: "oi" });
  });

  it("sem WHATSAPP_APP_SECRET → 503", async () => {
    vi.stubEnv("WHATSAPP_APP_SECRET", "");
    const r = await POST(new Request(URL_BASE, { method: "POST", body: "{}" }));
    expect(r.status).toBe(503);
  });
});
