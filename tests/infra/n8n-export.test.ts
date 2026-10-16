import { describe, expect, it } from "vitest";
import { normalizarWorkflow } from "../../scripts/n8n-export";

const ids = { workflows: { "chat-teste": "wfChatTesteDemo1" } };

const exportado = {
  id: "wfChatTesteDemo1",
  name: "Chat Teste",
  active: true,
  nodes: [{ id: "n1", name: "Chat", type: "@n8n/n8n-nodes-langchain.chatTrigger", parameters: {} }],
  connections: {},
  settings: { executionOrder: "v1" },
  staticData: null,
  pinData: { Chat: [{ json: {} }] },
  meta: { instanceId: "abc123", templateCredsSetupCompleted: true },
  versionId: "v-1",
  activeVersionId: "v-1",
  createdAt: "2026-10-16T00:00:00Z",
  updatedAt: "2026-10-16T01:00:00Z",
  triggerCount: 1,
  shared: [{ role: "workflow:owner" }],
  tags: [],
};

describe("normalizarWorkflow (INF-RF-07)", () => {
  it("remove campos voláteis, desativa e nomeia pelo slug", () => {
    const r = normalizarWorkflow(exportado, { ids, segredos: [] });
    expect(r.slug).toBe("chat-teste");
    expect(r.workflow).toEqual({
      id: "wfChatTesteDemo1",
      name: "Chat Teste",
      active: false,
      nodes: exportado.nodes,
      connections: {},
      settings: { executionOrder: "v1" },
      staticData: null,
      meta: { templateCredsSetupCompleted: true },
    });
  });

  it("workflow desconhecido devolve slug null", () => {
    expect(normalizarWorkflow({ ...exportado, id: "outro" }, { ids, segredos: [] }).slug).toBeNull();
  });

  it("falha se algum segredo do .env aparece no JSON", () => {
    const comSegredo = { ...exportado, nodes: [{ ...exportado.nodes[0], parameters: { header: "chave-super-secreta" } }] };
    expect(() => normalizarWorkflow(comSegredo, { ids, segredos: ["chave-super-secreta"] })).toThrow(/segredo/i);
  });
});
