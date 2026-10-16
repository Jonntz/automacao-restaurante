import { describe, expect, it } from "vitest";
import { inicioDoDiaSaoPaulo, tempoRelativo } from "@/lib/admin/tempo";

describe("inicioDoDiaSaoPaulo (ADM-RF-05)", () => {
  it("23h30 em SP (02:30 UTC do dia seguinte) pertence ao dia anterior", () => {
    const agora = new Date("2026-10-17T02:30:00Z");
    expect(inicioDoDiaSaoPaulo(agora).toISOString()).toBe("2026-10-16T03:00:00.000Z");
  });

  it("00h10 em SP já é o novo dia", () => {
    const agora = new Date("2026-10-17T03:10:00Z");
    expect(inicioDoDiaSaoPaulo(agora).toISOString()).toBe("2026-10-17T03:00:00.000Z");
  });
});

describe("tempoRelativo (ADM-RF-09)", () => {
  const agora = new Date("2026-10-16T21:00:00Z");
  const antes = (ms: number) => new Date(agora.getTime() - ms);
  it.each([
    [30_000, "agora"],
    [5 * 60_000, "há 5 min"],
    [59 * 60_000, "há 59 min"],
    [2 * 3600_000, "há 2 h"],
    [50 * 3600_000, "há 2 d"],
  ])("%i ms → %s", (ms, esperado) => {
    expect(tempoRelativo(antes(ms), agora)).toBe(esperado);
  });
});
