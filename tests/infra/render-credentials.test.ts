import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { montarCredenciais, PLACEHOLDER } = require("../../n8n/bootstrap/render-credentials.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { idsParaPublicar } = require("../../n8n/bootstrap/publicaveis.js");

const ENV_COMPLETO = {
  GEMINI_API_KEY: "AIza-teste",
  WHATSAPP_ACCESS_TOKEN: "EAAG-teste",
  WHATSAPP_BUSINESS_ACCOUNT_ID: "123",
  DB_POSTGRESDB_HOST: "postgres",
  DB_POSTGRESDB_PORT: "5432",
  DB_POSTGRESDB_DATABASE: "n8n",
  DB_POSTGRESDB_USER: "n8n",
  DB_POSTGRESDB_PASSWORD: "senha-pg",
  N8N_WEBHOOK_SECRET: "segredo-interno",
  BOT_API_KEY: "chave-bot",
};

describe("montarCredenciais (INF-RF-04)", () => {
  it("gera as 5 credenciais com IDs fixos, tipos e campos", () => {
    const { credenciais, avisos } = montarCredenciais(ENV_COMPLETO);
    expect(avisos).toEqual([]);
    expect(credenciais.map((c: { id: string; type: string }) => [c.id, c.type])).toEqual([
      ["credGeminiDemo01", "googlePalmApi"],
      ["credWhatsappDem1", "whatsAppApi"],
      ["credPostgresDem1", "postgres"],
      ["credWebhookIntr1", "httpHeaderAuth"],
      ["credApiBotDemo01", "httpHeaderAuth"],
    ]);
    const porId = Object.fromEntries(credenciais.map((c: { id: string; data: unknown }) => [c.id, c.data]));
    expect(porId.credGeminiDemo01).toEqual({ host: "https://generativelanguage.googleapis.com", apiKey: "AIza-teste" });
    expect(porId.credWhatsappDem1).toEqual({ accessToken: "EAAG-teste", businessAccountId: "123" });
    expect(porId.credPostgresDem1).toMatchObject({ host: "postgres", port: 5432, database: "n8n", user: "n8n", password: "senha-pg" });
    expect(porId.credWebhookIntr1).toEqual({ name: "x-webhook-secret", value: "segredo-interno" });
    expect(porId.credApiBotDemo01).toEqual({ name: "x-api-key", value: "chave-bot" });
  });

  it("variável ausente vira placeholder com aviso, sem falhar", () => {
    const { credenciais, avisos } = montarCredenciais({ ...ENV_COMPLETO, GEMINI_API_KEY: "", WHATSAPP_ACCESS_TOKEN: undefined });
    expect(credenciais[0].data.apiKey).toBe(PLACEHOLDER);
    expect(credenciais[1].data.accessToken).toBe(PLACEHOLDER);
    expect(avisos).toHaveLength(2);
    expect(avisos.join()).toMatch(/GEMINI_API_KEY/);
  });
});

describe("idsParaPublicar (INF-RF-04)", () => {
  it("publica todo workflow com gatilho, inclusive sub-workflows (n8n 2.x só executa a versão publicada)", () => {
    const wfs = [
      { id: "a", nodes: [{ type: "n8n-nodes-base.webhook" }] },
      { id: "b", nodes: [{ type: "@n8n/n8n-nodes-langchain.chatTrigger" }] },
      { id: "c", nodes: [{ type: "n8n-nodes-base.executeWorkflowTrigger" }, { type: "n8n-nodes-base.httpRequest" }] },
      { id: "d", nodes: [{ type: "n8n-nodes-base.httpRequest" }] },
    ];
    expect(idsParaPublicar(wfs)).toEqual(["a", "b", "c"]);
  });
});
