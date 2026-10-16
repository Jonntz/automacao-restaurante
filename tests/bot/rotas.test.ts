import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarProvedorMock } from "@/lib/pagamentos/mock";
import { notificadorNulo } from "@/lib/notificacoes/notificador";
import { criarDbComSeed } from "../helpers/fixtures";

vi.mock("@/lib/bot/deps", () => ({
  getDepsBot: async () => ({
    db: await criarDbComSeed(),
    provedor: criarProvedorMock(),
    notificador: notificadorNulo,
    agora: () => new Date(),
  }),
}));

const contexto = await import("@/app/api/bot/contexto/route");
const pedidos = await import("@/app/api/bot/pedidos/route");
const revisar = await import("@/app/api/bot/pedidos/revisar/route");

const CHAVE = "chave-do-bot-para-testes-123";
const url = (caminho: string) => `http://localhost${caminho}`;
const get = (caminho: string, chave: string | null = CHAVE) =>
  new Request(url(caminho), { headers: chave ? { "x-api-key": chave } : {} });
const post = (caminho: string, corpo: string, chave: string | null = CHAVE) =>
  new Request(url(caminho), {
    method: "POST",
    headers: { "content-type": "application/json", ...(chave ? { "x-api-key": chave } : {}) },
    body: corpo,
  });

describe("rotas /api/bot/* (CA-01, CA-09)", () => {
  beforeEach(() => vi.stubEnv("BOT_API_KEY", CHAVE));

  it("CA-01: todas as rotas exigem x-api-key", async () => {
    const respostas = await Promise.all([
      contexto.GET(get("/api/bot/contexto?telefone=1", null)),
      pedidos.GET(get("/api/bot/pedidos?telefone=1", null)),
      pedidos.POST(post("/api/bot/pedidos", "{}", null)),
      revisar.POST(post("/api/bot/pedidos/revisar", "{}", "errada-errada-errada")),
    ]);
    expect(respostas.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });

  it("contexto sem telefone → 400", async () => {
    const r = await contexto.GET(get("/api/bot/contexto"));
    expect(r.status).toBe(400);
  });

  it("POST /pedidos feliz → 201 com pix", async () => {
    const r = await pedidos.POST(
      post(
        "/api/bot/pedidos",
        JSON.stringify({ telefone: "5511999990000", itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" }),
      ),
    );
    expect(r.status).toBe(201);
    const corpo = await r.json();
    expect(corpo.pix.copiaECola).toMatch(/^000201/);
    expect(corpo.pedido.numero).toBe("#0001");
  });

  it("CA-09: JSON quebrado → 400 com exemplo", async () => {
    const r = await pedidos.POST(post("/api/bot/pedidos", "{itens: [}"));
    expect(r.status).toBe(400);
    const corpo = await r.json();
    expect(corpo.codigo).toBe("FORMATO_INVALIDO");
    expect(corpo.erros[0]).toMatch(/Exemplo/);
  });

  it("revisar com item inválido → 422", async () => {
    const r = await revisar.POST(
      post("/api/bot/pedidos/revisar", JSON.stringify({ itens: [{ itemId: 99 }], tipoEntrega: "retirada" })),
    );
    expect(r.status).toBe(422);
  });
});
