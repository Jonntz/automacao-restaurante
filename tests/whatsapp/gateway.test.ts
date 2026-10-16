import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { encaminharParaN8n } from "@/lib/whatsapp/encaminhar";
import { processarWebhookWhatsapp } from "@/lib/whatsapp/gateway";
import { criarDbTeste } from "../helpers/db";
import { APP_SECRET, assinar, payloadMeta } from "./helpers";

const agora = new Date("2026-10-16T21:00:00Z");
const deps = { appSecret: APP_SECRET, agora: () => agora, log: { warn: vi.fn() } };

describe("processarWebhookWhatsapp (WPP-RF-02, WPP-RF-06…08)", () => {
  it("CA-02: assinatura inválida → 401 e nada a encaminhar", async () => {
    const db = await criarDbTeste();
    const corpo = payloadMeta("texto", agora);
    const r = await processarWebhookWhatsapp(db, { corpoBruto: corpo, assinatura: assinar(corpo, "outro") }, deps);
    expect(r).toEqual({ status: 401, corpo: { ok: false, erro: "Assinatura inválida" }, encaminhar: [] });
  });

  it("CA-03/CA-04: mensagem nova é encaminhada uma única vez", async () => {
    const db = await criarDbTeste();
    const corpo = payloadMeta("texto", agora);
    const primeira = await processarWebhookWhatsapp(db, { corpoBruto: corpo, assinatura: assinar(corpo) }, deps);
    expect(primeira.status).toBe(200);
    expect(primeira.encaminhar.map((m) => m.messageId)).toEqual(["wamid.TEXTO1"]);
    const segunda = await processarWebhookWhatsapp(db, { corpoBruto: corpo, assinatura: assinar(corpo) }, deps);
    expect(segunda).toMatchObject({ status: 200, encaminhar: [] });
  });

  it("WPP-RF-08: JSON malformado com assinatura válida → 200 sem encaminhar", async () => {
    const db = await criarDbTeste();
    const corpo = fs.readFileSync(path.resolve(__dirname, "../fixtures/meta/malformado.txt"), "utf8");
    const r = await processarWebhookWhatsapp(db, { corpoBruto: corpo, assinatura: assinar(corpo) }, deps);
    expect(r).toEqual({ status: 200, corpo: { ok: true }, encaminhar: [] });
  });

  it("CA-05: só statuses → 200 sem encaminhar", async () => {
    const db = await criarDbTeste();
    const corpo = payloadMeta("statuses", agora);
    const r = await processarWebhookWhatsapp(db, { corpoBruto: corpo, assinatura: assinar(corpo) }, deps);
    expect(r).toMatchObject({ status: 200, encaminhar: [] });
  });
});

describe("encaminharParaN8n (WPP-RF-07)", () => {
  const msg = (id: string) => ({ telefone: "5511999990000", nome: "Ana", tipo: "texto" as const, texto: id, messageId: id, timestamp: 0 });

  it("um POST por mensagem, em ordem, com header secreto", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response("{}"));
    await encaminharParaN8n([msg("a"), msg("b")], { n8nUrl: "http://n8n:5678/", segredo: "segredo-interno", fetch });
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://n8n:5678/webhook/whatsapp-entrada");
    expect(new Headers(init?.headers).get("x-webhook-secret")).toBe("segredo-interno");
    expect(JSON.parse(String(init?.body))).toEqual({ telefone: "5511999990000", nome: "Ana", tipo: "texto", texto: "a", messageId: "a" });
    expect(JSON.parse(String(fetch.mock.calls[1][1]?.body)).messageId).toBe("b");
  });

  it("falha do n8n é registrada e não interrompe as demais", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("{}"));
    const warn = vi.fn();
    await expect(
      encaminharParaN8n([msg("a"), msg("b")], { n8nUrl: "http://n8n", segredo: "s", fetch, log: { warn } }),
    ).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
