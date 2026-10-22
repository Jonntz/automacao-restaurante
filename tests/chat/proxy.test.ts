import { describe, expect, it, vi } from "vitest";
import { encaminharChat } from "@/lib/chat/proxy";

const WEBHOOK_ID = "6f1d6a43-8b5e-4f0a-9c3e-0b0d1e2f3a4b";
const SEGREDO = "segredo-interno-123";

function preparar(resposta: () => Promise<Response> = async () => Response.json({ output: "Olá! 🍕" })) {
  const fetch = vi.fn<typeof globalThis.fetch>(resposta);
  const log = { warn: vi.fn() };
  const deps = { n8nUrl: "http://n8n:5678/", segredo: SEGREDO, webhookId: WEBHOOK_ID, fetch, log };
  return { fetch, log, deps };
}

const corpo = (dados: Record<string, unknown>) => JSON.stringify(dados);
const valido = { action: "sendMessage", sessionId: "a1b2-c3_d4", chatInput: "quero uma pizza" };

describe("encaminharChat (DEM-RF-02)", () => {
  it("CA-01: repassa só action/sessionId/chatInput ao Chat Teste, com o segredo, e devolve o output", async () => {
    const { fetch, deps } = preparar();
    const r = await encaminharChat(corpo({ ...valido, metadata: { x: 1 }, telefone: "5511999990000" }), deps);

    expect(r).toEqual({ status: 200, corpo: { output: "Olá! 🍕" } });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(`http://n8n:5678/webhook/${WEBHOOK_ID}/chat`);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-webhook-secret")).toBe(SEGREDO);
    expect(JSON.parse(String(init?.body))).toEqual(valido);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("CA-01: aceita chatInput com exatamente 1000 caracteres", async () => {
    const { fetch, deps } = preparar();
    await encaminharChat(corpo({ ...valido, chatInput: "a".repeat(1000) }), deps);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["JSON quebrado", "{nao-e-json"],
    ["action desconhecida", corpo({ ...valido, action: "apagarTudo" })],
    ["sessionId ausente", corpo({ action: "sendMessage", chatInput: "oi" })],
    ["sessionId com caracteres inválidos", corpo({ ...valido, sessionId: "../../admin" })],
    ["sessionId longo demais", corpo({ ...valido, sessionId: "s".repeat(101) })],
    ["chatInput vazio", corpo({ ...valido, chatInput: "   " })],
    ["chatInput que não é texto", corpo({ ...valido, chatInput: 42 })],
  ])("CA-02: %s → 400 sem chamar o n8n", async (_caso, bruto) => {
    const { fetch, deps } = preparar();
    const r = await encaminharChat(bruto, deps);
    expect(r.status).toBe(400);
    expect(r.corpo).toHaveProperty("erro");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("CA-02: chatInput acima de 1000 caracteres → 200 pedindo mensagem mais curta, sem chamar o n8n", async () => {
    const { fetch, deps } = preparar();
    const r = await encaminharChat(corpo({ ...valido, chatInput: "a".repeat(1001) }), deps);
    expect(r.status).toBe(200);
    expect((r.corpo as { output: string }).output).toMatch(/mais curta/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["erro de rede", async () => Promise.reject(new TypeError("fetch failed"))],
    ["timeout", async () => Promise.reject(new DOMException("The operation was aborted due to timeout", "TimeoutError"))],
    ["HTTP 500", async () => new Response("Internal error", { status: 500 })],
    ["HTTP 404 (workflow despublicado)", async () => Response.json({ message: "not registered" }, { status: 404 })],
    ["JSON sem output", async () => Response.json({ resultado: "x" })],
    ["resposta que não é JSON", async () => new Response("<html>")],
  ])("CA-03: n8n com %s → 200 com a mensagem de indisponibilidade e log sem segredo", async (_caso, resposta) => {
    const { log, deps } = preparar(resposta);
    const r = await encaminharChat(corpo(valido), deps);
    expect(r.status).toBe(200);
    expect((r.corpo as { output: string }).output).toMatch(/indisponível/);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(String(log.warn.mock.calls[0][0])).not.toContain(SEGREDO);
  });

  it("CA-04: loadPreviousSession → { data: [] } sem chamar o n8n", async () => {
    const { fetch, deps } = preparar();
    const r = await encaminharChat(corpo({ action: "loadPreviousSession", sessionId: "abc" }), deps);
    expect(r).toEqual({ status: 200, corpo: { data: [] } });
    expect(fetch).not.toHaveBeenCalled();
  });
});
