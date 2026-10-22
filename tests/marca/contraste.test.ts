import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// MRC-RF-05 / CA-02: contraste WCAG 2.x ≥ 4,5:1 dos pares de tokens usados em texto, nos dois temas.

const css = fs.readFileSync(path.resolve(__dirname, "../../src/app/globals.css"), "utf8");

function tokens(seletor: string): Record<string, string> {
  const inicio = css.search(new RegExp(`(^|\\n)${seletor.replace(".", "\\.")}\\s*\\{`));
  if (inicio < 0) throw new Error(`bloco ${seletor} não encontrado`);
  const bloco = css.slice(inicio, css.indexOf("}", inicio));
  return Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PARES: [texto: string, fundo: string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["destructive", "background"],
  ["destructive", "card"],
];

describe("contraste dos tokens da marca (CA-02)", () => {
  it("referência: preto sobre branco = 21:1", () => {
    expect(contraste("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  for (const [tema, seletor] of [
    ["claro", ":root"],
    ["escuro", ".dark"],
  ] as const) {
    describe(`tema ${tema}`, () => {
      const t = tokens(seletor);
      it.each(PARES)("%s sobre %s ≥ 4,5:1", (texto, fundo) => {
        expect(t[texto], `--${texto} em hex no bloco ${seletor}`).toBeDefined();
        expect(t[fundo], `--${fundo} em hex no bloco ${seletor}`).toBeDefined();
        expect(contraste(t[texto], t[fundo])).toBeGreaterThanOrEqual(4.5);
      });
    });
  }
});
