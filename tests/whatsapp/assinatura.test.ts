import { describe, expect, it } from "vitest";
import { validarAssinaturaMeta } from "@/lib/whatsapp/assinatura";
import { APP_SECRET, assinar } from "./helpers";

const corpo = '{"object":"whatsapp_business_account","entry":[]}';

describe("validarAssinaturaMeta (WPP-RF-02, CA-02)", () => {
  it("assinatura válida", () => expect(validarAssinaturaMeta(corpo, assinar(corpo), APP_SECRET)).toBe(true));
  it("aceita hex em maiúsculas", () =>
    expect(validarAssinaturaMeta(corpo, `sha256=${assinar(corpo).slice(7).toUpperCase()}`, APP_SECRET)).toBe(true));
  it("assinada com outro segredo", () => expect(validarAssinaturaMeta(corpo, assinar(corpo, "outro"), APP_SECRET)).toBe(false));
  it("corpo alterado", () => expect(validarAssinaturaMeta(`${corpo} `, assinar(corpo), APP_SECRET)).toBe(false));
  it("header ausente", () => expect(validarAssinaturaMeta(corpo, null, APP_SECRET)).toBe(false));
  it("sem prefixo sha256=", () => expect(validarAssinaturaMeta(corpo, assinar(corpo).slice(7), APP_SECRET)).toBe(false));
  it("tamanho diferente", () => expect(validarAssinaturaMeta(corpo, "sha256=abc", APP_SECRET)).toBe(false));
  it("app secret vazio nunca valida", () => expect(validarAssinaturaMeta(corpo, assinar(corpo, ""), "")).toBe(false));
});
