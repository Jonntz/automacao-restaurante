# 010 — Plano técnico

## Arquivos
```
public/marca/logo.jpg, public/marca/logo-quadrada.png   # imagem enviada + recorte quadrado (PIL)
src/app/icon.png                                         # ícone da aba (convenção do Next)
src/app/globals.css                                      # tokens hex claro/escuro + --font-heading/--font-script
src/app/layout.tsx                                       # fontes Anton/Barlow/Yellowtail + ThemeProvider (padrão escuro)
src/components/provedor-tema.tsx                         # wrapper client do next-themes
src/components/alternar-tema.tsx                         # Switch sol/lua (aria-label "Tema escuro")
src/components/marca.tsx                                 # logo + wordmark + slogan (tamanhos sm/lg)
src/app/admin/layout.tsx, src/app/login/page.tsx, src/app/page.tsx   # usam <Marca/> e <AlternarTema/>
src/lib/db/seed.ts                                       # aplicarSeed(db, dados) + CARDAPIO_DEMO (pizzaria)
tests/helpers/cardapio-teste.ts                          # cardápio fixo dos testes (o antigo "Burger Demo")
tests/marca/contraste.test.ts                            # CA-02: lê os tokens do globals.css e calcula o contraste WCAG
n8n/prompts/atendente.md + n8n/workflows/*.json          # regras de pizzaria + customCss do Chat Teste
scripts/e2e-admin.mjs, scripts/smoke-chat.ts             # pizzas + verificação do switch de tema
```

## Tokens de tema (hex)
| Token | Claro (`:root`) | Escuro (`.dark`) |
|---|---|---|
| background | `#FBF5EC` (creme claro) | `#130B06` (carvão) |
| foreground | `#211209` | `#F4E6CF` |
| card / popover | `#FFFFFF` | `#1E120A` |
| primary | `#F28A0A` (laranja) | `#F88E05` |
| primary-foreground | `#1A0E06` | `#1A0E06` (contorno escuro, como na logo) |
| secondary | `#F8C02A` (ouro) | `#3A2414` |
| secondary-foreground | `#1A0E06` | `#F8C02A` |
| muted | `#F3E6D2` | `#26170D` |
| muted-foreground | `#6B4F36` | `#C9AE8C` |
| accent | `#FCE7C3` | `#2E1C10` |
| destructive | `#B3261E` | `#FF6B5E` |
| border / input | `#E6D3B8` | `#3A2616` |
| ring | `#D8660F` | `#F8C02A` |

O laranja nunca é usado como cor de texto pequeno sobre fundo claro (contraste insuficiente). Ele aparece como preenchimento de botão (com texto escuro), em bordas e no wordmark grande.

## Seed demo "Container Lanches"
| Categoria (ordem) | Itens (preço) |
|---|---|
| Pizzas Tradicionais — Grande, 8 fatias (1) | Mussarela (49,90) · Calabresa (52,90) · Margherita (54,90) · Portuguesa (58,90) · Frango com Catupiry (59,90) · Quatro Queijos (62,90) |
| Pizzas Especiais — Grande, 8 fatias (2) | Container (69,90) · Pepperoni (66,90) · Lombo com Catupiry (64,90) |
| Pizzas Doces — Broto, 4 fatias (3) | Chocolate com Morango (39,90) · Romeu e Julieta (36,90) · Banana com Canela (34,90) |
| Bordas Recheadas (4) | Borda de Catupiry (9,90) · Borda de Cheddar (9,90) · Borda de Chocolate (11,90) |
| Bebidas (5) | Coca-Cola 2 L (14,90) · Guaraná Antarctica 2 L (12,90) · Coca-Cola Lata (6,50) · Suco Natural (9,90) · Água sem Gás (4,00) |

Os IDs seguem a ordem de inserção (1–20). Configuração: nome "Container Lanches", taxa R$ 5,00, "40–50 min", "Todos os dias, 18h às 23h30", retirada na "Rua Exemplo, 123 – Centro".

## Decisões
- **`next-themes`**, que já está no projeto por causa do Sonner:
  - `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`, `disableTransitionOnChange`;
  - o `<html>` recebe `suppressHydrationWarning`, porque o script do next-themes altera a classe antes da hidratação;
  - com Cache Components, o provider é client e não lê dados de request, então o shell continua estático.
- **Switch de tema:** só é montado depois da hidratação (`useSyncExternalStore`/montado), para não divergir do servidor. Tem `aria-label="Tema escuro"`, o que o diferencia do switch "Loja aberta" no e2e.
- **Contraste testado:** o teste lê `globals.css`, extrai os hex dos blocos `:root` e `.dark` e calcula a luminância relativa WCAG 2.x.
- **Chat Teste:**
  - `customCss` é uma expressão n8n (`={{ … }}`) só para injetar `$env.APP_URL` na URL da logo (o compose passa `APP_URL` ao n8n);
  - as fontes vêm por `@import` do Google Fonts;
  - um `@media (prefers-color-scheme: light)` troca as variáveis para o tema claro.
- **Meio a meio pelo preço do sabor mais caro:** é a regra comum em pizzarias e não exige mudar o banco. A IA escolhe o item e o servidor cobra o preço dele (Constituição I preservada).
- **Banco local:** como o seed é idempotente e não apaga o cardápio antigo, a troca exige `pnpm db:reset`, com o `pnpm dev` parado.

## Riscos
- **Expressões no `customCss` do Chat Trigger:** se não forem avaliadas na versão fixada, o plano B é a logo embutida como data URI pequena (PNG de 96 px).
- **Yellowtail é decorativa:** fica restrita ao wordmark e nunca vai em texto corrido.
