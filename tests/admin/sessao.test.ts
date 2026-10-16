import { describe, expect, it } from "vitest";
import { criarTokenSessao, DURACAO_SESSAO_SEGUNDOS, verificarTokenSessao } from "@/lib/auth/sessao";
import { validarCredenciais } from "@/lib/auth/credenciais";

const SEGREDO = "x".repeat(32);
const AGORA = new Date("2026-10-16T21:00:00Z");

describe("sessão JWT (ADM-RF-01, CA-03)", () => {
  it("token válido devolve o e-mail", async () => {
    const token = await criarTokenSessao("admin@demo.com", SEGREDO, AGORA);
    expect(await verificarTokenSessao(token, SEGREDO, AGORA)).toEqual({ email: "admin@demo.com" });
  });

  it("token expirado → null", async () => {
    const token = await criarTokenSessao("admin@demo.com", SEGREDO, AGORA);
    const depois = new Date(AGORA.getTime() + (DURACAO_SESSAO_SEGUNDOS + 1) * 1000);
    expect(await verificarTokenSessao(token, SEGREDO, depois)).toBeNull();
  });

  it("assinado com outra chave → null", async () => {
    const token = await criarTokenSessao("admin@demo.com", "y".repeat(32), AGORA);
    expect(await verificarTokenSessao(token, SEGREDO, AGORA)).toBeNull();
  });

  it("lixo ou vazio → null", async () => {
    expect(await verificarTokenSessao("abc.def.ghi", SEGREDO, AGORA)).toBeNull();
    expect(await verificarTokenSessao(undefined, SEGREDO, AGORA)).toBeNull();
  });
});

describe("validarCredenciais (ADM-RF-01, CA-02)", () => {
  const env = { ADMIN_EMAIL: "admin@demo.com", ADMIN_PASSWORD: "senha-forte", SESSION_SECRET: SEGREDO };

  it("credenciais certas (e-mail sem diferenciar maiúsculas)", () => {
    expect(validarCredenciais(" Admin@Demo.com ", "senha-forte", env)).toBe(true);
  });

  it.each([
    ["outro@demo.com", "senha-forte"],
    ["admin@demo.com", "senha-errada"],
    ["", ""],
  ])("recusa %s / %s", (email, senha) => {
    expect(validarCredenciais(email, senha, env)).toBe(false);
  });
});
