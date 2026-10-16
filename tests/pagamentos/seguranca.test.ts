import { describe, expect, it } from "vitest";
import { compararSegredo } from "@/lib/seguranca";

describe("compararSegredo (PAG-RF-12)", () => {
  it("igual → true", () => expect(compararSegredo("abc123", "abc123")).toBe(true));
  it("diferente → false", () => expect(compararSegredo("abc124", "abc123")).toBe(false));
  it("tamanhos diferentes → false (sem lançar)", () => expect(compararSegredo("abc", "abc123")).toBe(false));
  it("esperado vazio nunca autoriza", () => expect(compararSegredo("", "")).toBe(false));
  it("recebido nulo → false", () => expect(compararSegredo(null, "abc")).toBe(false));
});
