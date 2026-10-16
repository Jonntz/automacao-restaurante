import { describe, expect, it } from "vitest";
import { lerEnvBanco, lerEnvAdmin } from "@/lib/env";

describe("env (FUN-RF-06, CA-06)", () => {
  it("falha citando DATABASE_URL quando ausente", () => {
    expect(() => lerEnvBanco({})).toThrow(/DATABASE_URL/);
  });

  it("aceita file:, libsql: e :memory:", () => {
    expect(lerEnvBanco({ DATABASE_URL: "file:./local.db" }).DATABASE_URL).toBe("file:./local.db");
    expect(lerEnvBanco({ DATABASE_URL: "libsql://x.turso.io", DATABASE_AUTH_TOKEN: "t" }).DATABASE_AUTH_TOKEN).toBe("t");
    expect(lerEnvBanco({ DATABASE_URL: ":memory:" }).DATABASE_URL).toBe(":memory:");
  });

  it("lista todas as variáveis faltantes do grupo e aponta o .env.example", () => {
    const erro = (() => {
      try {
        lerEnvAdmin({ ADMIN_EMAIL: "a@b.com" });
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(erro).toMatch(/ADMIN_PASSWORD/);
    expect(erro).toMatch(/SESSION_SECRET/);
    expect(erro).toMatch(/\.env\.example/);
  });

  it("exige SESSION_SECRET com pelo menos 32 caracteres", () => {
    expect(() =>
      lerEnvAdmin({ ADMIN_EMAIL: "a@b.com", ADMIN_PASSWORD: "x", SESSION_SECRET: "curto" }),
    ).toThrow(/SESSION_SECRET/);
  });
});
