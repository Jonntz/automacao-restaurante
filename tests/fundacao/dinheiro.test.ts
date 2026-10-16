import { describe, expect, it } from "vitest";
import { formatarCentavos, parseReais } from "@/lib/dinheiro";

// Intl usa espaço não separável entre "R$" e o número; normalizamos para comparar.
const normalizar = (s: string) => s.replace(/\s/g, " ");

describe("formatarCentavos (FUN-RF-08, CA-04)", () => {
  it.each([
    [0, "R$ 0,00"],
    [590, "R$ 5,90"],
    [2590, "R$ 25,90"],
    [123456, "R$ 1.234,56"],
  ])("%i → %s", (centavos, esperado) => {
    expect(normalizar(formatarCentavos(centavos))).toBe(esperado);
  });

  it("rejeita valor não inteiro", () => {
    expect(() => formatarCentavos(10.5)).toThrow();
  });
});

describe("parseReais (FUN-RF-08, CA-05)", () => {
  it.each([
    ["25,90", 2590],
    ["25.9", 2590],
    ["25", 2500],
    ["0,5", 50],
    ["R$ 1.234,56", 123456],
    ["  R$7,50 ", 750],
    ["1.234", 123400],
  ])("%s → %i", (texto, esperado) => {
    expect(parseReais(texto)).toBe(esperado);
  });

  it.each(["abc", "-1", "", "1,234", "12,3,4", "1.2.3,45"])("%s → null", (texto) => {
    expect(parseReais(texto)).toBeNull();
  });
});
