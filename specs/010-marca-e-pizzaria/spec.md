# 010 — Marca Container Lanches e cardápio de pizzaria

## Objetivo
Dar à PoC a identidade visual da logo enviada pelo usuário ("Container Lanches — Sabor que reina") no painel, no login, na landing e no Chat Teste, com **tema claro e escuro alternáveis por switch**. O restaurante passa a ser uma **pizzaria**: o seed demo, o prompt do atendente e os roteiros de teste mudam para pizzas.

## Decisões do usuário (2026-10-22)
- **Nome:** Container Lanches, com o slogan "Sabor que reina".
- **Tamanhos:** pizzas salgadas só no tamanho **Grande (8 fatias)** e doces só em **Broto (4 fatias)**. Meio a meio cobra o sabor mais caro.
- **Tema do painel:** **claro e escuro**, com switch de troca.

## Histórias
- **H1.** Como dono, quero que o painel tenha a cara da minha marca (cores, fontes e logo).
- **H2.** Como cozinha, quero alternar entre tema claro e escuro conforme a luz do ambiente, e que a escolha fique salva.
- **H3.** Como cliente, quero pedir pizza inteira ou meio a meio, com borda recheada, e pagar o preço certo.
- **H4.** Como quem demonstra, quero que o Chat Teste já pareça o atendimento da Container Lanches.

## Requisitos funcionais

### Identidade visual
- **MRC-RF-01** — A paleta vem da logo. As cores foram extraídas por amostragem de pixels da imagem enviada:

  | Papel | Cor | Origem na logo |
  |---|---|---|
  | Carvão (fundo escuro) | `#130B06` / `#211209` | fundo atrás do herói |
  | Laranja (primária) | `#F88E05` → `#D8660F` | gradiente do "CONTAINER" |
  | Ouro (destaque) | `#F8C02A` / `#E18D16` | coroa |
  | Creme | `#EFD7B1` | script "Lanches" |
  | Vermelho (alerta) | `#6D0706` (base) | capa |

  Os tokens de tema (`--background`, `--primary`…) ficam em `src/app/globals.css`, em hexadecimal, para o tema claro (`:root`) e para o escuro (`.dark`).
- **MRC-RF-02** — Tipografia (Google Fonts via `next/font`):
  - **Anton** nos títulos (`font-heading`), em caixa alta e condensada como "CONTAINER";
  - **Barlow** no texto e na interface (`font-sans`);
  - **Yellowtail** só no nome da marca (`font-script`), como "Lanches".
- **MRC-RF-03** — Logo e marca:
  - a imagem enviada fica em `public/marca/logo.jpg`, com uma versão quadrada recortada (`logo-quadrada.png`) para avatar e ícone;
  - o componente `<Marca/>` (logo + "CONTAINER" + "Lanches" + slogan) aparece no cabeçalho do admin, no login e na landing;
  - o ícone da aba usa a versão quadrada.
- **MRC-RF-04** — Tema claro e escuro:
  - um switch no cabeçalho do admin e no login alterna o tema na hora;
  - a escolha fica salva no navegador (`next-themes`); o padrão é o **escuro**, fiel à logo;
  - não pode haver "flash" do tema errado ao carregar;
  - os toasts acompanham o tema.
- **MRC-RF-05** — Contraste WCAG AA nos dois temas: ≥ 4,5:1 entre texto e fundo para os pares de tokens usados em texto:
  - fundo/texto;
  - card;
  - primária (botão);
  - secundária;
  - texto atenuado (muted) sobre fundo e sobre muted;
  - destrutiva sobre fundo.
- **MRC-RF-06** — Chat Teste com a marca:
  - `customCss` do Chat Trigger com cores e fontes da marca e a logo no cabeçalho, servida pelo Next em `{APP_URL}/marca/logo-quadrada.png`;
  - título "Container Lanches", subtítulo "Sabor que reina · atendimento de teste" e mensagem inicial com 🍕;
  - o tema segue a preferência do sistema (`prefers-color-scheme`), porque a página é do n8n e não comporta um switch nosso.

### Pizzaria
- **MRC-RF-07** — O seed demo vira a pizzaria **Container Lanches**, com o cardápio de [plan.md](plan.md#seed-demo-container-lanches). A configuração usa o mesmo endereço, tempo e taxa de antes.
- **MRC-RF-08** — Os testes de regra de negócio usam um **cardápio de teste fixo** (`tests/helpers/cardapio-teste.ts`), independente do seed demo. `seedDemo(db)` passa a ser `aplicarSeed(db, CARDAPIO_DEMO)`, e os testes usam `aplicarSeed(db, CARDAPIO_TESTE)`.
- **MRC-RF-09** — O prompt do atendente ganha regras de pizzaria:
  - salgadas são Grandes (8 fatias) e doces são Broto (4 fatias);
  - **meio a meio**: no máximo 2 sabores, ambos salgados ou ambos doces; usar o `itemId` do sabor **mais caro** e pôr na `observacao` "meio <sabor A> / meio <sabor B>" (o servidor cobra o preço do item informado);
  - **borda recheada**: item separado da categoria Bordas, um por pizza, e a borda de chocolate só em pizza doce.
- **MRC-RF-10** — Textos de marca:
  - "Burger Demo" sai da landing, do metadata, do Chat Teste, da documentação e do mock do Pix (o recebedor passa a ser `CONTAINER LANCHES`);
  - o `pnpm e2e:admin` e o `pnpm smoke` passam a usar pizzas.

## Requisitos não funcionais
- **MRC-RNF-01** — `pnpm typecheck`, `lint`, `test` e `build` continuam verdes, e `pnpm e2e:admin` passa nos dois temas.
- **MRC-RNF-02** — Nenhuma fonte externa além das Google Fonts carregadas pelo `next/font` (auto-hospedadas no build). O chat do n8n importa as mesmas fontes do Google Fonts.

## Critérios de aceite
- **CA-01** — Dado o admin, quando clico no switch de tema, então o tema muda na hora e continua o mesmo depois de recarregar a página.
- **CA-02 (auto)** — Dados os tokens do `globals.css`, então cada par texto/fundo listado no MRC-RF-05 tem contraste ≥ 4,5:1 nos dois temas.
- **CA-03** — Dado o admin e o login, então a logo e o wordmark "CONTAINER Lanches" aparecem, e os títulos usam Anton.
- **CA-04 (auto)** — Dado o seed demo, então existem 5 categorias e 20 itens; as salgadas indicam "Grande, 8 fatias" e as doces "Broto, 4 fatias" no nome da categoria.
- **CA-05 (manual)** — Dado o Chat Teste:
  - "quero meia calabresa e meia quatro queijos, para retirada" leva a um resumo com **Quatro Queijos** (o sabor mais caro, R$ 62,90) e a observação "meio calabresa / meio quatro queijos";
  - pedir uma borda recheada inclui o item da borda.
- **CA-06 (manual)** — Dado o Chat Teste aberto no navegador, então o cabeçalho mostra a logo e o título "Container Lanches" com as cores da marca.
- **CA-07 (auto)** — Dado que o seed demo muda, então os testes de cálculo, pedidos, pagamento e API continuam passando, porque usam o cardápio de teste.

## Fora de escopo
Tamanhos e variações no modelo de dados, pizzas com 3+ sabores, montagem de pizza por ingredientes, edição de cores pelo painel.

## Histórico
- 2026-10-22 — versão inicial.
- 2026-10-22 — Decisões tomadas na implementação:
  - **Logo grande** (login e landing): usa o **emblema** circular do personagem (`emblema.png`, alta resolução) + o wordmark tipográfico + o slogan. A imagem retangular repetia o nome e mostrava os cantos do upload. O original fica em `public/marca/logo.jpg`.
  - **Chat Teste:** o `@n8n/chat` estiliza o cabeçalho com `.chat-layout .chat-header` e variáveis (`--chat--header--background`, `--chat--header--border-bottom`, `--chat--input--container--background`). O CSS da marca usa essas variáveis e o mesmo nível de seletor.
  - **Expressão `{{ $env.APP_URL }}` no `customCss`:** é avaliada pelo n8n 2.43.4, então o plano B (data URI) não foi necessário.
