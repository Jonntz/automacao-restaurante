// Roteiro E2E do painel admin (specs/005-painel-admin ADM-RNF-04 e specs/010-marca-e-pizzaria).
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

// Pedido criado pela API só aparece no próximo poll (5 s, ADM-RF-07). No ambiente local, o banco em
// arquivo ainda pode atrasar ~5 s a primeira consulta depois de uma escrita (pendência em docs/troubleshooting.md).
const ESPERA_POLLING_MS = 10_000;

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
    itens: [{ itemId: 1, quantidade: 1 }, { itemId: 18, quantidade: 1 }], // Mussarela + Coca-Cola Lata
    tipoEntrega: "retirada",
  });
  if (r.status !== 201) throw new Error(`bot respondeu ${r.status}: ${JSON.stringify(r.corpo)}`);
  numero = r.corpo.pedido.numero;
  await card("Aguardando pagamento", numero).waitFor({ timeout: ESPERA_POLLING_MS });
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
  const r = await bot("/pedidos", { telefone, itens: [{ itemId: 10, quantidade: 1 }], tipoEntrega: "retirada" }); // Chocolate com Morango
  const n = r.corpo.pedido.numero;
  await card("Aguardando pagamento", n).getByRole("button", { name: "Cancelar" }).click({ timeout: ESPERA_POLLING_MS });
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancelar pedido" }).click();
  await card("Concluídos hoje", n).waitFor({ timeout: 8000 });
  ok("ADM-RF-10", `cancelar ${n} com diálogo leva para "Concluídos hoje"`);
} catch (e) {
  falha("ADM-RF-10", "cancelar", e);
}
await page.screenshot({ path: path.join(PASTA, "pedidos-1400.png"), fullPage: true });

try {
  // MRC-RF-04 / CA-01 (010): switch de tema troca na hora e persiste após recarregar; padrão escuro
  const tema = page.getByRole("switch", { name: "Tema escuro" });
  const escuro = () => page.evaluate(() => document.documentElement.classList.contains("dark"));
  if (!(await escuro())) throw new Error("o padrão deveria ser o tema escuro");
  await tema.click();
  if (await escuro()) throw new Error("não trocou para o claro");
  await page.reload();
  await page.getByRole("switch", { name: "Tema escuro" }).waitFor();
  if (await escuro()) throw new Error("o tema claro não persistiu após recarregar");
  await page.screenshot({ path: path.join(PASTA, "pedidos-1400-claro.png"), fullPage: true });
  await page.getByRole("switch", { name: "Tema escuro" }).click();
  if (!(await escuro())) throw new Error("não voltou para o escuro");
  ok("CA-01 (010)", "switch de tema: escuro por padrão, troca na hora e persiste após recarregar");
} catch (e) {
  falha("CA-01 (010)", "switch de tema", e);
}

const nomeItem = `Pizza E2E ${Date.now().toString().slice(-4)}`;
try {
  await page.goto(`${BASE}/admin/cardapio`);
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome").fill(nomeItem);
  await dialogo.getByLabel("Preço (R$)").fill("45,90");
  await dialogo.getByRole("button", { name: "Salvar" }).click();
  await page.getByText(`Item “${nomeItem}” salvo.`).waitFor({ timeout: 8000 });
  await page.getByText(nomeItem).first().waitFor({ timeout: 8000 });
  const ctx = await bot(`/contexto?telefone=${encodeURIComponent(telefone)}`);
  if (!ctx.corpo.cardapioTexto.includes(`${nomeItem} — R$ 45,90`)) throw new Error("item ausente do cardapioTexto do bot");
  ok("CA-07", `"${nomeItem}" a R$ 45,90 criado e já presente para o bot`);
} catch (e) {
  falha("CA-07", "novo item", e);
}

try {
  const interruptor = page.getByRole("switch", { name: "Calabresa disponível" });
  if ((await interruptor.getAttribute("aria-checked")) !== "true") throw new Error("Calabresa deveria começar disponível");
  await interruptor.click();
  await page.getByText("Calabresa indisponível.").waitFor({ timeout: 8000 });
  const r = await bot("/pedidos/revisar", { itens: [{ itemId: 2, quantidade: 1 }], tipoEntrega: "retirada" });
  if (r.status !== 422 || !JSON.stringify(r.corpo).includes("indisponível")) throw new Error(JSON.stringify(r));
  await interruptor.click();
  await page.getByText("Calabresa disponível.").waitFor({ timeout: 8000 });
  ok("CA-08", "Calabresa indisponível faz o bot receber 422; religada depois");
} catch (e) {
  falha("CA-08", "disponibilidade", e);
}

try {
  const loja = page.locator("#loja-aberta"); // switch "Loja aberta/fechada" do cabeçalho
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

async function dialogoDeItemCabe(rotulo) {
  // CA-11 (005): com nome de categoria longo, nenhum campo do diálogo "Editar item" passa da caixa
  await page.goto(`${BASE}/admin/cardapio`);
  await page.getByRole("button", { name: "Editar Mussarela" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Nome").waitFor();
  await page.waitForTimeout(400); // fim da animação de abertura (scale), que distorce as medidas
  const caixa = await dialogo.boundingBox();
  const campos = await dialogo.locator('input, textarea, [data-slot="select-trigger"]').evaluateAll((els) =>
    els
      // ignora os inputs nativos escondidos que o Radix cria (aria-hidden, opacidade 0)
      .filter((el) => el.getAttribute("aria-hidden") !== "true" && getComputedStyle(el).opacity !== "0" && el.type !== "hidden")
      .map((el) => ({ slot: el.getAttribute("data-slot") ?? el.tagName, ...el.getBoundingClientRect().toJSON() })),
  );
  const fora = campos.filter((c) => c.width > 0 && (c.left < caixa.x - 1 || c.right > caixa.x + caixa.width + 1));
  const nomeCategoria = await dialogo.locator('[data-slot="select-value"]').evaluate((el) => ({ texto: el.textContent, cortado: el.scrollWidth > el.clientWidth }));
  console.log(`   ↳ @${rotulo}: categoria "${nomeCategoria.texto}" ${nomeCategoria.cortado ? "truncada com reticências" : "inteira"}`);
  await page.screenshot({ path: path.join(PASTA, `dialogo-item-${rotulo}.png`) });
  await page.keyboard.press("Escape");
  if (fora.length) throw new Error(`campos fora da caixa: ${fora.map((c) => `${c.slot} (direita ${Math.round(c.right)} > ${Math.round(caixa.x + caixa.width)})`).join(", ")}`);
}

async function medirKanban(largura, altura) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.goto(`${BASE}/admin/pedidos`);
  await coluna("Aguardando pagamento").waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(PASTA, `kanban-${largura}x${altura}.png`) });
  return page.evaluate(() => {
    const colunas = [...document.querySelectorAll("section")].filter((s) => s.querySelector("h2"));
    const caixa = colunas[0].parentElement.getBoundingClientRect();
    return {
      caixa: { left: caixa.left, right: caixa.right, width: caixa.width },
      colunas: colunas.map((c) => c.getBoundingClientRect().toJSON()),
      largura: window.innerWidth,
      altura: window.innerHeight,
      alturaPagina: document.documentElement.scrollHeight,
      // cards espremidos: conteúdo maior que a caixa visível (a lista deve rolar, não encolher os cards)
      cardsCortados: colunas.flatMap((c) => [...c.querySelectorAll('[data-slot="card"]')]).filter((card) => card.scrollHeight - card.clientHeight > 1).length,
    };
  });
}

// CA-12 (005): kanban ocupa 100% da tela de forma responsiva
for (const [largura, altura] of [
  [1920, 1080],
  [1280, 800],
]) {
  try {
    const m = await medirKanban(largura, altura);
    const larguras = m.colunas.map((c) => c.width);
    const problemas = [];
    if (m.colunas.length !== 5) problemas.push(`${m.colunas.length} colunas`);
    if (Math.max(...larguras) - Math.min(...larguras) > 2) problemas.push(`larguras diferentes (${larguras.map(Math.round).join("/")})`);
    const sobraDireita = m.caixa.right - m.colunas.at(-1).right;
    if (sobraDireita > 2) problemas.push(`sobra ${Math.round(sobraDireita)}px à direita das colunas`);
    if (m.largura - m.caixa.width > 48) problemas.push(`kanban usa só ${Math.round(m.caixa.width)} de ${m.largura}px`);
    if (m.alturaPagina > m.altura + 1) problemas.push(`página rola na vertical (${m.alturaPagina} > ${m.altura})`);
    const faltaEmbaixo = m.altura - Math.max(...m.colunas.map((c) => c.bottom));
    if (faltaEmbaixo > 40) problemas.push(`colunas terminam ${Math.round(faltaEmbaixo)}px antes do fim da janela`);
    if (m.cardsCortados) problemas.push(`${m.cardsCortados} card(s) espremido(s) com conteúdo cortado`);
    if (problemas.length) throw new Error(problemas.join("; "));
    ok("CA-12", `kanban @${largura}x${altura}: 5 colunas iguais de ${Math.round(larguras[0])}px ocupando a largura e a altura`);
  } catch (e) {
    falha("CA-12", `kanban @${largura}x${altura}`, e);
  }
}
try {
  const m = await medirKanban(390, 844);
  const proporcao = m.colunas[0].width / m.largura;
  if (Math.abs(proporcao - 0.88) > 0.03) throw new Error(`coluna com ${Math.round(proporcao * 100)}% da largura`);
  if (m.alturaPagina > m.altura + 1) throw new Error(`página rola na vertical (${m.alturaPagina} > ${m.altura})`);
  if (m.cardsCortados) throw new Error(`${m.cardsCortados} card(s) espremido(s) com conteúdo cortado`);
  ok("CA-12", `kanban @390px: cada coluna com ${Math.round(proporcao * 100)}% da tela, rolagem lateral`);
} catch (e) {
  falha("CA-12", "kanban @390px", e);
}
await page.setViewportSize({ width: 1400, height: 900 });

// CA-13 (005): polling estável, no máximo 1 requisição a cada 5 s (com o som desligado e ligado)
async function contarPolling(ms) {
  let n = 0;
  const contar = (r) => r.url().includes("/api/admin/pedidos") && n++;
  page.on("request", contar);
  await page.waitForTimeout(ms);
  page.off("request", contar);
  return n;
}
try {
  await page.goto(`${BASE}/admin/pedidos`);
  await page.getByText(/Atualizado há/).waitFor({ timeout: 15000 });
  const desligado = await contarPolling(12_000);
  await page.getByRole("button", { name: "Ativar som" }).click();
  const ligado = await contarPolling(12_000);
  if (desligado > 3 || ligado > 4) {
    throw new Error(`${desligado} requisições em 12 s com o som desligado e ${ligado} com ele ligado (esperado ≤ 3 e ≤ 4)`);
  }
  ok("CA-13", `polling estável: ${desligado} e ${ligado} requisições em 12 s (som desligado/ligado)`);
} catch (e) {
  falha("CA-13", "polling", e);
}

try {
  await dialogoDeItemCabe("1400");
  ok("CA-11", "diálogo de item com categoria longa cabe na caixa @1400px");
} catch (e) {
  falha("CA-11", "diálogo de item @1400px", e);
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
  if (largura === 390) {
    try {
      await dialogoDeItemCabe("390");
      ok("CA-11", "diálogo de item com categoria longa cabe na caixa @390px");
    } catch (e) {
      falha("CA-11", "diálogo de item @390px", e);
    }
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
