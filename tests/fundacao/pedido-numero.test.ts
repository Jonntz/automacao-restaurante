import { describe, expect, it } from "vitest";
import { numeroPedido } from "@/lib/pedido-numero";

describe("numeroPedido (FUN-RF-10)", () => {
  it.each([
    [1, "#0001"],
    [12, "#0012"],
    [9999, "#9999"],
    [12345, "#12345"],
  ])("%i → %s", (id, esperado) => {
    expect(numeroPedido(id)).toBe(esperado);
  });
});
