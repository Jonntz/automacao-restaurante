import { describe, expect, it, vi } from "vitest";
import { criarNotificadorN8n, notificadorNulo } from "@/lib/notificacoes/notificador";

const log = { warn: vi.fn() };
const DESTINO = { telefone: "5511999990000", canal: "whatsapp" as const };

describe("criarNotificadorN8n (PED-RF-19)", () => {
  it("faz POST no webhook do n8n com header secreto e corpo {telefone, mensagem}", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const n = criarNotificadorN8n({ n8nUrl: "http://n8n:5678/", segredo: "segredo-123", fetch, log });
    await n.notificar(DESTINO, "Olá");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://n8n:5678/webhook/notificar-cliente");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-webhook-secret")).toBe("segredo-123");
    expect(JSON.parse(String(init?.body))).toEqual({ telefone: "5511999990000", mensagem: "Olá" });
  });

  it("CA-12: ignora canal teste", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    const n = criarNotificadorN8n({ n8nUrl: "http://n8n", segredo: "s", fetch, log });
    await n.notificar({ telefone: "teste:abc", canal: "teste" }, "Olá");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("CA-13: engole resposta 500 e registra aviso sem expor o segredo", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("x", { status: 500 }));
    const warn = vi.fn();
    const n = criarNotificadorN8n({ n8nUrl: "http://n8n", segredo: "segredo-xyz", fetch, log: { warn } });
    await expect(n.notificar(DESTINO, "Olá")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain("segredo-xyz");
    expect(String(warn.mock.calls[0][0])).not.toContain("5511999990000");
  });

  it("CA-13: engole timeout", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const warn = vi.fn();
    const n = criarNotificadorN8n({ n8nUrl: "http://n8n", segredo: "s", fetch, log: { warn }, timeoutMs: 10 });
    await expect(n.notificar(DESTINO, "Olá")).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("notificadorNulo não faz nada (PED-RF-20)", async () => {
    await expect(notificadorNulo.notificar(DESTINO, "x")).resolves.toBeUndefined();
  });
});
