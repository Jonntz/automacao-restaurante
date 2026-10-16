import { describe, expect, it } from "vitest";
import { extrairMensagens } from "@/lib/whatsapp/parse";
import { payloadMeta } from "./helpers";

const agora = new Date("2026-10-16T21:00:00Z");
const ler = (nome: string, idade?: number) => JSON.parse(payloadMeta(nome, agora, idade));

describe("extrairMensagens (WPP-RF-03…05)", () => {
  it("texto com nome vindo de contacts", () => {
    expect(extrairMensagens(ler("texto"), agora)).toEqual([
      {
        telefone: "5511999990000",
        nome: "Ana",
        tipo: "texto",
        texto: "oi",
        messageId: "wamid.TEXTO1",
        timestamp: agora.getTime() - 5000,
      },
    ]);
  });

  it("CA-06: áudio vira tipo outro sem texto", () => {
    expect(extrairMensagens(ler("audio"), agora)).toMatchObject([{ tipo: "outro", texto: null, messageId: "wamid.AUDIO1" }]);
  });

  it("CA-05: payload só de statuses não gera mensagens", () => {
    expect(extrairMensagens(ler("statuses"), agora)).toEqual([]);
  });

  it("CA-06: mensagem com mais de 10 min é ignorada", () => {
    expect(extrairMensagens(ler("texto", 15 * 60), agora)).toEqual([]);
    expect(extrairMensagens(ler("texto", 9 * 60), agora)).toHaveLength(1);
  });

  it("várias mensagens mantêm a ordem", () => {
    expect(extrairMensagens(ler("duas-mensagens"), agora).map((m) => m.texto)).toEqual(["quero um x-burguer", "e uma coca"]);
  });

  it("object diferente ou formato estranho → nada", () => {
    expect(extrairMensagens({ ...ler("texto"), object: "page" }, agora)).toEqual([]);
    expect(extrairMensagens(null, agora)).toEqual([]);
    expect(extrairMensagens({ object: "whatsapp_business_account", entry: "x" }, agora)).toEqual([]);
  });
});
