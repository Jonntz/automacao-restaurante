// Roteiro E2E do painel admin (specs/005-painel-admin, ADM-RNF-04).
// Pré-requisitos: `pnpm dev` rodando, `.env` preenchido e Google Chrome instalado.
// Uso: pnpm e2e:admin   (CHROME_PATH=/caminho/do/chrome para outro navegador Chromium)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const env = process.env;
const BASE = env.APP_URL ?? "http://localhost:3000";
const PASTA = path.resolve(".e2e");
fs.mkdirSync(PASTA, { recursive: true });

const resultados = [];
let falhas = 0;
const ok = (ca, descricao) => resultados.push(`✅ ${ca} ${descricao}`);
const falha = (ca, descricao, e) => {
  falhas++;
  resultados.push(`❌ ${ca} ${descricao}: ${String(e?.message ?? e).split("\n")[0]}`);
};

async function bot(caminho, corpo) {
  const r = await fetch(`${BASE}/api/bot${caminho}`, {
    method: corpo ? "POST" : "GET",
    headers: { "x-api-key": env.BOT_API_KEY ?? "", "content-type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, corpo: await r.json() };
}

// Canal "teste": não dispara notificações de WhatsApp.
const telefone = `teste:e2e-${Date.now()}`;
const browser = await chromium.launch(
  env.CHROME_PATH ? { executablePath: env.CHROME_PATH, headless: true } : { channel: "chrome", headless: true },
);
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errosConsole = [];
page.on("console", (m) => m.type() === "error" && errosConsole.push(m.text()));
page.on("pageerror", (e) => errosConsole.push(e.message));

const coluna = (titulo) => page.locator("section", { has: page.getByRole("heading", { name: titulo, exact: true }) });
const card = (titulo, numero) => coluna(titulo).locator('[data-slot="card"]', { hasText: numero });

try {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("E-mail").fill(env.ADMIN_EMAIL);
  await page.getByLabel("Senha").fill("senha-errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("alert").filter({ hasText: "E-mail ou senha inválidos" }).waitFor({ timeout: 5000 });
  if ((await page.context().cookies()).some((c) => c.name === "sessao")) throw new Error("cookie criado com senha errada");
  if ((await page.getByLabel("E-mail").inputValue()) !== env.ADMIN_EMAIL) throw new Error("e-mail apagado após erro");
  await page.getByLabel("Senha").fill(env.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin/pedidos", { timeout: 10000 });
  ok("CA-02", "login recusa senha errada (mantendo o e-mail) e aceita a certa");
} catch (e) {
  falha("CA-02", "login", e);
}

let numero;
try {
  await coluna("Aguardando pagamento").waitFor();
  const r = await bot("/pedidos", {
    telefone,
    nomeCliente: "Verificação E2E",
    itens: [{ itemId: 1, quantidade: 1 }, { itemId: 8, quantidade: 1 }],
    tipoEntrega: "retirada",
  });
  if (r.status !== 201) throw new Error(`bot respondeu ${r.status}: ${JSON.stringify(r.corpo)}`);
  numero = r.corpo.pedido.numero;
  await card("Aguardando pagamento", numero).waitFor({ timeout: 8000 });
  ok("CA-04", `pedido ${numero} apareceu em "Aguardando pagamento" sem recarregar`);
} catch (e) {
  falha("CA-04", "polling", e);
}

try {
  await card("Aguardando pagamento", numero).getByRole("button", { name: "Simular pagamento" }).click();
  await card("Pagos — novos", numero).waitFor({ timeout: 10000 });
  await page.getByText(/simulado e confirmado/).first().waitFor({ timeout: 5000 });
  ok("CA-05", "simular pagamento move para Pagos — novos e mostra toast");
} catch (e) {
  falha("CA-05", "simular pagamento", e);
}

try {
  await card("Pagos — novos", numero).getByRole("button", { name: "Iniciar preparo" }).click();
  const botao = card("Em preparo", numero).getByRole("button", { name: "Pronto para retirada" });
  await botao.waitFor({ timeout: 8000 });
  await botao.click();
  await card("Saiu / Pronto", numero).waitFor({ timeout: 8000 });
  ok("CA-06", 'retirada: "Pronto para retirada" leva para "Saiu / Pronto"');
} catch (e) {
  falha("CA-06", "avanço de status", e);
}

try {
  await card("Saiu / Pronto", numero).getByRole("button", { name: numero }).click();
  await page.getByRole("dialog").getByText("Pagamento (Pix)").waitFor({ timeout: 3000 });
  await page.getByRole("dialog").getByText("Verificação E2E").waitFor();
  await page.keyboard.press("Escape");
  ok("ADM-RF-11", "Sheet de detalhes abre com cliente e pagamento");
} catch (e) {
  falha("ADM-RF-11", "detalhes", e);
}

try {
  const r = await bot("/pedidos", { telefone, itens: [{ itemId: 12, quantidade: 1 }], tipoEntrega: "retirada" });
  const n = r.corpo.pedido.numero;
  await card("Aguardando pagamento", n).getByRole("button", { name: "Cancelar" }).click({ timeout: 8000 });
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await card("Concluídos hoje", n).waitFor({ timeout: 8000 });
  ok("ADM-RF-10", `cancelar ${n} com diálogo leva para "Concluídos hoje"`);
} catch (e) {
  falha("ADM-RF-10", "cancelar", e);
}
await page.screenshot({ path: path.join(PASTA, "pedidos-1400.png"), fullPage: true });

const nomeItem = `Coxinha E2E ${Date.now().toString().slice(-4)}`;
try {
  await page.goto(`${BASE}/admin/cardapio`);
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome").fill(nomeItem);
  await dialogo.getByLabel("Preço (R$)").fill("7,50");
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await page.getByText(`Item “${nomeItem}” salvo.`).waitFor({ timeout: 8000 });
  await page.getByText(nomeItem).first().waitFor({ timeout: 8000 });
  const ctx = await bot(`/contexto?telefone=${encodeURIComponent(telefone)}`);
  if (!ctx.corpo.cardapioTexto.includes(`${nomeItem} — R$ 7,50`)) throw new Error("item ausente do cardapioTexto do bot");
  ok("CA-07", `"${nomeItem}" a R$ 7,50 criado e já presente para o bot`);
} catch (e) {
  falha("CA-07", "novo item", e);
}

try {
  const interruptor = page.getByRole("switch", { name: "X-Bacon disponível" });
  if ((await interruptor.getAttribute("aria-checked")) !== "true") throw new Error("X-Bacon deveria começar disponível");
  await interruptor.click();
  await page.getByText("X-Bacon indisponível.").waitFor({ timeout: 8000 });
  const r = await bot("/pedidos/revisar", { itens: [{ itemId: 3, quantidade: 1 }], tipoEntrega: "retirada" });
  if (r.status !== 422 || !JSON.stringify(r.corpo).includes("indisponível")) throw new Error(JSON.stringify(r));
  await interruptor.click();
  await page.getByText("X-Bacon disponível.").waitFor({ timeout: 8000 });
  ok("CA-08", "X-Bacon indisponível faz o bot receber 422; religado depois");
} catch (e) {
  falha("CA-08", "disponibilidade", e);
}

try {
  const loja = page.getByRole("switch").first();
  if ((await loja.getAttribute("aria-checked")) !== "true") throw new Error("a loja deveria começar aberta");
  await loja.click();
  await page.getByText(/Loja fechada: o bot/).waitFor({ timeout: 8000 });
  const r = await bot("/pedidos", { telefone, itens: [{ itemId: 1, quantidade: 1 }], tipoEntrega: "retirada" });
  if (r.status !== 409 || r.corpo.codigo !== "LOJA_FECHADA") throw new Error(JSON.stringify(r));
  await loja.click();
  await page.getByText(/Loja aberta: o bot/).waitFor({ timeout: 8000 });
  ok("CA-09", "loja fechada faz o bot receber 409 LOJA_FECHADA; reaberta depois");
} catch (e) {
  falha("CA-09", "loja aberta/fechada", e);
}
await page.screenshot({ path: path.join(PASTA, "cardapio-1400.png"), fullPage: true });

try {
  await page.getByRole("button", { name: `Excluir ${nomeItem}?` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await page.getByText("Item excluído.").waitFor({ timeout: 8000 });
  ok("ADM-RF-17", `item de teste "${nomeItem}" excluído (limpeza)`);
} catch (e) {
  falha("ADM-RF-17", "excluir item de teste", e);
}

for (const [largura, altura] of [
  [768, 1024],
  [390, 844],
]) {
  await page.setViewportSize({ width: largura, height: altura });
  for (const rota of ["pedidos", "cardapio"]) {
    await page.goto(`${BASE}/admin/${rota}`);
    await page.waitForTimeout(1500);
    const transborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(PASTA, `${rota}-${largura}.png`), fullPage: true });
    if (transborda) falha("ADM-RNF-01", `/admin/${rota} @${largura}px`, "página com rolagem horizontal");
    else ok("ADM-RNF-01", `/admin/${rota} @${largura}px sem rolagem horizontal`);
  }
}

await browser.close();
console.log(resultados.join("\n"));
if (errosConsole.length) {
  falhas++;
  console.log(`\n❌ Erros no console do navegador:\n- ${[...new Set(errosConsole)].join("\n- ")}`);
}
console.log(`\nScreenshots em ${PASTA}`);
process.exit(falhas ? 1 : 0);
