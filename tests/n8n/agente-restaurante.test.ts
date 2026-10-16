import { describe, expect, it } from "vitest";
import { acharNo, carregarWorkflow, destinos, executarCode, ids, lerArquivo } from "./helpers";

const wf = carregarWorkflow("agente-restaurante");
const montar = (output: string) =>
  executarCode(String(acharNo(wf, "Montar mensagens").parameters.jsCode), [{ json: { output } }])[0].json.mensagens as string[];

const BRCODE =
  "00020101021226410014br.gov.bcb.pix0119mock@burgerdemo.dev520400005303986540558.305802BR5911BURGER DEMO6009SAO PAULO62170513MOCK12112303f6304A558";

describe("Montar mensagens (IA-RF-06)", () => {
  it("CA-01: separa o código Pix numa mensagem própria", () => {
    expect(montar(`Pedido *#0013* criado! Total R$ 58,30.\n${BRCODE}`)).toEqual([
      "Pedido *#0013* criado! Total R$ 58,30.",
      BRCODE,
    ]);
  });

  it("CA-01: sem código, uma única mensagem", () => {
    expect(montar("Oi! Quer ver o cardápio?")).toEqual(["Oi! Quer ver o cardápio?"]);
  });

  it("CA-02: código com espaços no nome do recebedor é extraído inteiro", () => {
    const [, codigo] = montar(`Segue o Pix:\n${BRCODE}\n`);
    expect(codigo).toBe(BRCODE);
    expect(codigo).toContain("BURGER DEMO");
  });

  it("resposta vazia vira mensagem de fallback; mensagens longas são truncadas em 4096", () => {
    expect(montar("   ")).toHaveLength(1);
    expect(montar("x".repeat(5000))[0]).toHaveLength(4096);
  });
});

describe("estrutura do sub-workflow (IA-RF-01…05, IA-RF-07)", () => {
  it("tem ID fixo e entradas telefone, nome e texto", () => {
    expect(wf.id).toBe(ids.workflows["agente-restaurante"]);
    const entrada = acharNo(wf, "Entrada");
    expect(entrada.type).toBe("n8n-nodes-base.executeWorkflowTrigger");
    const valores = (entrada.parameters.workflowInputs as { values: { name: string }[] }).values.map((v) => v.name);
    expect(valores).toEqual(["telefone", "nome", "texto"]);
  });

  it("CA-03: system prompt do JSON é idêntico a n8n/prompts/atendente.md", () => {
    const opcoes = acharNo(wf, "Atendente").parameters.options as { systemMessage: string };
    expect(opcoes.systemMessage).toBe(`=${lerArquivo("n8n/prompts/atendente.md").trimEnd()}`);
  });

  it("liga Gemini, memória Postgres e as 3 ferramentas ao agente", () => {
    expect(destinos(wf, "Gemini", "ai_languageModel")).toEqual([["Atendente"]]);
    expect(destinos(wf, "Memória", "ai_memory")).toEqual([["Atendente"]]);
    for (const tool of ["revisar_pedido", "criar_pedido", "consultar_pedidos"]) {
      expect(destinos(wf, tool, "ai_tool")).toEqual([["Atendente"]]);
    }
    expect(acharNo(wf, "Memória").parameters).toMatchObject({ sessionIdType: "customKey", contextWindowLength: 20 });
  });

  it("IA-RF-07: erro do agente ou do contexto vai para o Fallback", () => {
    expect(acharNo(wf, "Atendente").onError).toBe("continueErrorOutput");
    expect(destinos(wf, "Atendente")).toEqual([["Montar mensagens"], ["Fallback"]]);
    expect(acharNo(wf, "Buscar contexto").onError).toBe("continueErrorOutput");
    expect(destinos(wf, "Buscar contexto")).toEqual([["Atendente"], ["Fallback"]]);
  });

  it("CA-04: telefone de criar/consultar vem do gatilho, nunca do LLM", () => {
    for (const nome of ["criar_pedido", "consultar_pedidos"]) {
      const texto = JSON.stringify(acharNo(wf, nome).parameters);
      expect(texto).toContain("$('Entrada').first().json.telefone");
      expect(texto).not.toMatch(/\$fromAI\(\s*['"]telefone/);
    }
  });

  it("credenciais apontam para os IDs fixos e nenhum segredo aparece no JSON", () => {
    expect(acharNo(wf, "Gemini").credentials?.googlePalmApi.id).toBe(ids.credenciais.gemini);
    expect(acharNo(wf, "Memória").credentials?.postgres.id).toBe(ids.credenciais.postgres);
    for (const nome of ["Buscar contexto", "revisar_pedido", "criar_pedido", "consultar_pedidos"]) {
      expect(acharNo(wf, nome).credentials?.httpHeaderAuth.id).toBe(ids.credenciais.apiBot);
    }
    expect(JSON.stringify(wf)).not.toMatch(/x-api-key"\s*:\s*"[^{]/);
  });
});

describe("Chat Teste (IA-RF-08)", () => {
  const chat = carregarWorkflow("chat-teste");

  it("Chat Trigger público com webhookId fixo chamando o agente", () => {
    expect(chat.id).toBe(ids.workflows["chat-teste"]);
    const gatilho = acharNo(chat, "Chat");
    expect(gatilho.type).toBe("@n8n/n8n-nodes-langchain.chatTrigger");
    expect(gatilho.webhookId).toBe(ids.chatTesteWebhookId);
    expect(gatilho.parameters).toMatchObject({ public: true, mode: "hostedChat" });

    const chamar = acharNo(chat, "Chamar atendente");
    expect(JSON.stringify(chamar.parameters)).toContain(ids.workflows["agente-restaurante"]);
    const valores = (chamar.parameters.workflowInputs as { value: Record<string, string> }).value;
    expect(valores.telefone).toBe("={{ 'teste:' + $json.sessionId }}");
    expect(valores.texto).toBe("={{ $json.chatInput }}");
    expect(destinos(chat, "Chat")).toEqual([["Chamar atendente"]]);
    expect(destinos(chat, "Chamar atendente")).toEqual([["Resposta"]]);
  });
});
