// Roteiro E2E do chat web (specs/011-demo-publica CA-05). Conversa com o agente de verdade (gasta cota do Gemini).
// Pré-requisitos: Next.js e n8n no ar e Google Chrome instalado.
// Uso: pnpm e2e:chat                                    (local, APP_URL do .env)
//      E2E_BASE_URL=https://<app>.vercel.app pnpm e2e:chat   (demo pública)
//      E2E_PEDIDO=1 pnpm e2e:chat                       (também faz um pedido e confere o bloco do Pix)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const env = process.env;
const BASE = (env.E2E_BASE_URL ?? env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const PASTA = path.resolve(".e2e");
fs.mkdirSync(PASTA, { recursive: true });
const INDISPONIVEL = "indisponível agora";

const resultados = [];
let falhas = 0;
const ok = (ca, descricao) => resultados.push(`✅ ${ca} ${descricao}`);
const falha = (ca, descricao, e) => {
  falhas++;
  resultados.push(`❌ ${ca} ${descricao}: ${String(e?.message ?? e).split("\n")[0]}`);
};

const browser = await chromium.launch(
  env.CHROME_PATH ? { executablePath: env.CHROME_PATH, headless: true } : { channel: "chrome", headless: true },
);
const contexto = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ["clipboard-read", "clipboard-write"] });
const page = await contexto.newPage();
const errosConsole = [];
page.on("console", (m) => m.type() === "error" && errosConsole.push(m.text()));
page.on("pageerror", (e) => errosConsole.push(e.message));

const baloes = (autor) => page.locator(`[data-autor="${autor}"]`);

/** Envia pelo campo (Enter) e espera a próxima fala do bot. */
async function falar(texto) {
  const antes = await baloes("bot").count();
  await page.getByLabel("Mensagem").fill(texto);
  await page.getByLabel("Mensagem").press("Enter");
  await baloes("cliente").filter({ hasText: texto }).waitFor({ timeout: 5000 });
  await page.getByRole("status", { name: "Atendente digitando" }).waitFor({ timeout: 5000 });
  await baloes("bot").nth(antes).waitFor({ timeout: 90_000 });
  const resposta = (await baloes("bot").nth(antes).innerText()).trim();
  if (!resposta) throw new Error("resposta vazia");
  if (resposta.includes(INDISPONIVEL)) throw new Error("o atendente respondeu indisponível (n8n fora do ar ou cota do Gemini)");
  return resposta;
}

try {
  await page.goto(`${BASE}/chat`);
  await baloes("bot").first().filter({ hasText: "Bem-vindo" }).waitFor({ timeout: 15_000 });
  const negrito = await baloes("bot").first().locator("strong").first().textContent();
  if (negrito !== "Container Lanches") throw new Error(`boas-vindas sem *negrito* renderizado (strong = ${negrito})`);
  if ((await page.getByRole("button", { name: "Ver o cardápio" }).count()) !== 1) throw new Error("sugestões não aparecem");
  ok("DEM-RF-01", "/chat abre com boas-vindas formatadas e sugestões");
} catch (e) {
  falha("DEM-RF-01", "abrir /chat", e);
}

try {
  const t0 = Date.now();
  const resposta = await falar("oi");
  if (await page.getByRole("button", { name: "Ver o cardápio" }).count()) throw new Error("sugestões continuam depois da primeira mensagem");
  ok("CA-05", `"oi" → atendente respondeu em ${((Date.now() - t0) / 1000).toFixed(1)} s: "${resposta.slice(0, 60).replace(/\n/g, " ")}…"`);
} catch (e) {
  falha("CA-05", "conversa", e);
}

try {
  const fundo = () => baloes("bot").first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const tema = () => page.evaluate(() => (document.documentElement.classList.contains("dark") ? "escuro" : "claro"));
  const inicial = { tema: await tema(), fundo: await fundo() };
  await page.screenshot({ path: path.join(PASTA, `chat-${inicial.tema}.png`) });
  await page.getByRole("switch", { name: "Tema escuro" }).click();
  await page.waitForTimeout(300);
  const trocado = { tema: await tema(), fundo: await fundo() };
  await page.screenshot({ path: path.join(PASTA, `chat-${trocado.tema}.png`) });
  if (trocado.tema === inicial.tema) throw new Error("o switch não trocou o tema");
  if (trocado.fundo === inicial.fundo) throw new Error("o balão do bot não mudou de cor com o tema");
  ok("CA-05", `tema ${inicial.tema} → ${trocado.tema} muda as cores do chat`);
} catch (e) {
  falha("CA-05", "troca de tema", e);
}

try {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const medida = await page.evaluate(() => ({
    transborda: document.documentElement.scrollWidth > window.innerWidth,
    rolaPagina: document.documentElement.scrollHeight > window.innerHeight + 1,
    campoVisivel: document.querySelector("textarea").getBoundingClientRect().bottom <= window.innerHeight,
  }));
  await page.screenshot({ path: path.join(PASTA, "chat-390.png") });
  if (medida.transborda) throw new Error("rolagem horizontal");
  if (medida.rolaPagina) throw new Error("a página rola (a conversa deveria rolar por dentro)");
  if (!medida.campoVisivel) throw new Error("campo de mensagem fora da tela");
  ok("CA-05", "@390px sem rolagem horizontal, campo visível e conversa rolando por dentro");
} catch (e) {
  falha("CA-05", "@390px", e);
}

if (env.E2E_PEDIDO) {
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await falar("quero 1 pizza mussarela para retirada, meu nome é Teste E2E Chat");
    const resumo = await falar("sim, pode confirmar o pedido");
    const pix = page.getByRole("button", { name: "Copiar código Pix" });
    if (!(await pix.count())) throw new Error(`sem bloco do Pix na resposta: "${resumo.slice(0, 120)}"`);
    await pix.last().click();
    const copiado = await page.evaluate(() => navigator.clipboard.readText());
    if (!/^000201.*6304[0-9A-F]{4}$/.test(copiado)) throw new Error(`área de transferência sem o código Pix (${copiado.slice(0, 20)}…)`);
    await page.screenshot({ path: path.join(PASTA, "chat-pix.png"), fullPage: false });
    ok("DEM-RF-10", "pedido confirmado mostra o bloco do Pix e o botão copia o código");
  } catch (e) {
    falha("DEM-RF-10", "pedido com Pix", e);
  }
}

await browser.close();
console.log(`Base: ${BASE}\n` + resultados.join("\n"));
if (errosConsole.length) {
  falhas++;
  console.log(`\n❌ Erros no console do navegador:\n- ${[...new Set(errosConsole)].join("\n- ")}`);
}
console.log(`\nScreenshots em ${PASTA}`);
process.exit(falhas ? 1 : 0);
