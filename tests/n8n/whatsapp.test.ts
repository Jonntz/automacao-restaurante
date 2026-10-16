import { describe, expect, it } from "vitest";
import { acharNo, carregarWorkflow, destinos, ids } from "./helpers";

describe("WhatsApp Entrada (WPP-RF-09, WPP-RF-11)", () => {
  const wf = carregarWorkflow("whatsapp-entrada");

  it("webhook interno protegido por header e respondendo na hora", () => {
    expect(wf.id).toBe(ids.workflows["whatsapp-entrada"]);
    const webhook = acharNo(wf, "Webhook");
    expect(webhook.parameters).toMatchObject({
      httpMethod: "POST",
      path: "whatsapp-entrada",
      authentication: "headerAuth",
      responseMode: "onReceived",
    });
    expect(webhook.credentials?.httpHeaderAuth.id).toBe(ids.credenciais.webhookInterno);
    expect(webhook.webhookId).toBeTruthy();
  });

  it("texto vai para o agente e cada mensagem é enviada em ordem; outros tipos recebem aviso", () => {
    expect(destinos(wf, "Webhook")).toEqual([["É texto?"]]);
    expect(destinos(wf, "É texto?")).toEqual([["Chamar atendente"], ["Avisar só texto"]]);
    expect(destinos(wf, "Chamar atendente")).toEqual([["Separar mensagens"]]);
    expect(destinos(wf, "Separar mensagens")).toEqual([["Responder no WhatsApp"]]);
    expect(JSON.stringify(acharNo(wf, "Chamar atendente").parameters)).toContain(ids.workflows["agente-restaurante"]);
    expect(acharNo(wf, "Separar mensagens").parameters).toMatchObject({ fieldToSplitOut: "mensagens" });
  });

  it("envio pela Cloud API: phoneNumberId do env, credencial fixa, retry ligado", () => {
    for (const nome of ["Responder no WhatsApp", "Avisar só texto"]) {
      const no = acharNo(wf, nome);
      expect(no.type).toBe("n8n-nodes-base.whatsApp");
      expect(no.parameters).toMatchObject({
        operation: "send",
        messageType: "text",
        phoneNumberId: "={{ $env.WHATSAPP_PHONE_NUMBER_ID }}",
        recipientPhoneNumber: "={{ $('Webhook').first().json.body.telefone }}",
      });
      expect(no.credentials?.whatsAppApi.id).toBe(ids.credenciais.whatsapp);
      expect(no.retryOnFail).toBe(true);
    }
    expect(acharNo(wf, "Avisar só texto").parameters.textBody).toMatch(/só consigo ler mensagens de texto/);
  });
});

describe("Notificar Cliente (WPP-RF-10, WPP-RF-11)", () => {
  const wf = carregarWorkflow("notificar-cliente");

  it("webhook interno → envio → resposta ok; falha → 502", () => {
    expect(wf.id).toBe(ids.workflows["notificar-cliente"]);
    expect(acharNo(wf, "Webhook").parameters).toMatchObject({
      path: "notificar-cliente",
      authentication: "headerAuth",
      responseMode: "responseNode",
    });
    expect(acharNo(wf, "Webhook").credentials?.httpHeaderAuth.id).toBe(ids.credenciais.webhookInterno);
    const envio = acharNo(wf, "Enviar WhatsApp");
    expect(envio.parameters).toMatchObject({
      recipientPhoneNumber: "={{ $json.body.telefone }}",
      textBody: "={{ $json.body.mensagem }}",
    });
    expect(envio.onError).toBe("continueErrorOutput");
    expect(envio.retryOnFail).toBe(true);
    expect(destinos(wf, "Enviar WhatsApp")).toEqual([["OK"], ["Falhou"]]);
    expect(acharNo(wf, "Falhou").parameters).toMatchObject({ options: { responseCode: 502 } });
  });
});

describe("nenhum workflow contém tokens literais", () => {
  it.each(["agente-restaurante", "chat-teste", "whatsapp-entrada", "notificar-cliente"])("%s", (slug) => {
    const texto = JSON.stringify(carregarWorkflow(slug));
    expect(texto).not.toMatch(/EAAG|AIza|Bearer [A-Za-z0-9]/);
  });
});
