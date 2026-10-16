import { describe, expect, it } from "vitest";
import { exigirApiKey } from "@/lib/bot/autenticacao";

const req = (chave?: string) =>
  new Request("http://localhost/api/bot/contexto", { headers: chave ? { "x-api-key": chave } : {} });

describe("exigirApiKey (BOT-RF-01)", () => {
  const CHAVE = "chave-do-bot-1234567890";

  it("sem header → 401", async () => {
    const r = exigirApiKey(req(), { BOT_API_KEY: CHAVE });
    expect(r?.status).toBe(401);
    expect(await r?.json()).toEqual({ ok: false, erro: "Não autorizado" });
  });

  it("chave errada → 401", () => {
    expect(exigirApiKey(req("outra-chave-qualquer-xx"), { BOT_API_KEY: CHAVE })?.status).toBe(401);
  });

  it("chave certa → null (segue)", () => {
    expect(exigirApiKey(req(CHAVE), { BOT_API_KEY: CHAVE })).toBeNull();
  });

  it("sem BOT_API_KEY configurada → 503", async () => {
    const r = exigirApiKey(req(CHAVE), {});
    expect(r?.status).toBe(503);
    expect(await r?.json()).toEqual({ ok: false, erro: "API do bot não configurada" });
  });
});
