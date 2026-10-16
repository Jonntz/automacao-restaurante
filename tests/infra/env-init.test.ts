import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { lerEnvAdmin, lerEnvBot, lerEnvN8n } from "@/lib/env";
import { preencherEnv, SEGREDOS_GERADOS } from "../../scripts/env-init";

const exemplo = fs.readFileSync(".env.example", "utf8");
let n = 0;
const gerar = (bytes: number) => `${String(++n).padStart(2, "0")}${"a".repeat(bytes * 2 - 2)}`;
const comoObjeto = (texto: string) =>
  Object.fromEntries(
    texto
      .split("\n")
      .filter((l) => /^[A-Z0-9_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
  );

describe("preencherEnv (ENT-RF-07)", () => {
  it("gera todos os segredos, mantém o resto e passa nas validações do app", () => {
    const { conteudo, senhaAdmin } = preencherEnv(exemplo, gerar);
    const env = comoObjeto(conteudo);
    for (const chave of SEGREDOS_GERADOS) {
      expect(env[chave], chave).toBeTruthy();
      expect(env[chave], chave).not.toMatch(/^troque/);
    }
    expect(env.ADMIN_PASSWORD).toBe(senhaAdmin);
    expect(env.PAGAMENTO_PROVEDOR).toBe("mock");
    expect(env.DATABASE_URL).toBe("file:./local.db");
    expect(env.GEMINI_API_KEY).toBe("");
    expect(() => lerEnvAdmin(env)).not.toThrow();
    expect(() => lerEnvBot(env)).not.toThrow();
    expect(() => lerEnvN8n(env)).not.toThrow();
    // comentários e ordem preservados
    expect(conteudo.split("\n").length).toBe(exemplo.split("\n").length);
    expect(conteudo).toContain("# --- Pagamento Pix");
  });

  it("todo segredo com placeholder no exemplo está na lista de gerados", () => {
    const placeholders = Object.entries(comoObjeto(exemplo))
      .filter(([, v]) => v.startsWith("troque"))
      .map(([k]) => k);
    expect([...SEGREDOS_GERADOS].sort()).toEqual(placeholders.sort());
  });
});
