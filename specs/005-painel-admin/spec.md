# 005 — Painel Admin

## Objetivo
Dar ao restaurante uma tela para acompanhar e mover os pedidos em tempo quase real (kanban), simular ou verificar pagamentos, manter o cardápio e abrir ou fechar a loja.

## Histórias
- **H1.** Como dono, quero entrar com e-mail e senha e ninguém mais acessar o painel.
- **H2.** Como cozinha, quero ver os pedidos pagos chegando sem dar F5, com aviso sonoro, e avançar cada um com um clique.
- **H3.** Como quem demonstra, quero simular o pagamento de um pedido para mostrar o fluxo completo.
- **H4.** Como dono, quero cadastrar itens, mudar preço e marcar um item como esgotado na hora.
- **H5.** Como dono, quero fechar a loja e o bot parar de aceitar pedidos imediatamente.

## Requisitos funcionais

### Acesso
- **ADM-RF-01** — `/login` valida contra `ADMIN_EMAIL`/`ADMIN_PASSWORD`, com comparação timing-safe:
  - no sucesso, cria o cookie `sessao` (JWT HS256 com `SESSION_SECRET`, `httpOnly`, `sameSite=lax`, `secure` em produção, expira em 12h) e redireciona para `/admin/pedidos`;
  - no erro, mostra a mensagem genérica "E-mail ou senha inválidos".
- **ADM-RF-02** — O `src/proxy.ts` protege `/admin/:path*` e `/api/admin/:path*`:
  - sem sessão válida, página redireciona para `/login?de=<rota>` e API devolve **401** JSON;
  - `/login`, `/api/bot/*` e `/api/webhooks/*` ficam fora do matcher.
- **ADM-RF-03** — Toda server action e rota `/api/admin/*` chama `exigirSessao()` (defesa em profundidade, sem depender só do proxy).
- **ADM-RF-04** — Botão "Sair" apaga o cookie.

### Pedidos
- **ADM-RF-05** — `GET /api/admin/pedidos` devolve os pedidos **ativos** (qualquer status não final) e os **concluídos hoje** (`entregue`/`cancelado` com `atualizado_em` no dia corrente em `America/Sao_Paulo`). Cada pedido vem com itens, cliente, status efetivo do pagamento e as ações disponíveis.
- **ADM-RF-06** — Kanban com 5 colunas, cada uma com contador de pedidos:

  | Coluna | Status |
  |---|---|
  | Aguardando pagamento | `aguardando_pagamento` |
  | Pagos — novos | `pago` |
  | Em preparo | `em_preparo` |
  | Saiu / Pronto | `saiu_para_entrega`, `pronto_para_retirada` |
  | Concluídos hoje | `entregue`, `cancelado` |

  **Layout responsivo (100% da tela):**
  - o painel ocupa a altura da janela, com o cabeçalho fixo no topo e o conteúdo abaixo;
  - no kanban, cada coluna tem a altura disponível, com os cards rolando por dentro e o título da coluna sempre visível;
  - **≥ 1280 px:** as 5 colunas dividem 100% da largura em partes iguais, sem sobra lateral;
  - **640–1279 px:** colunas de 18rem, com rolagem horizontal só no kanban;
  - **< 640 px:** cada coluna ocupa ~88% da largura, com rolagem horizontal que encaixa coluna a coluna;
  - o cabeçalho usa a largura toda, alinhado ao kanban.

  Dentro da coluna, os mais antigos vêm primeiro.
- **ADM-RF-07** — O kanban se atualiza por **polling a cada 5 s**, sem recarregar a página, e mostra um indicador "atualizado há Xs".
- **ADM-RF-08** — Quando aparece um pedido novo em "Pagos — novos", o card ganha destaque visual por 30 s. Se o som estiver ativado, toca um bipe (Web Audio). O som começa desligado; um botão "Ativar som" respeita a política de autoplay do navegador.
- **ADM-RF-09** — Cada card mostra: número, nome ou telefone do cliente, tipo de entrega (ícone), itens resumidos, total e tempo desde a criação ("há 12 min"). Pedido de canal `teste` leva o badge "TESTE".
- **ADM-RF-10** — Ações no card:
  - **Avançar**, com rótulo de acordo com `proximoStatus`: "Iniciar preparo", "Saiu para entrega", "Pronto para retirada", "Concluir";
  - **Cancelar**, com diálogo de confirmação; num pedido pago, o diálogo avisa que o estorno é manual;
  - **Simular pagamento**, só em `aguardando_pagamento` e com provedor que permite simulação;
  - **Verificar pagamento**, só em `aguardando_pagamento`.

  O resultado aparece num toast, e o kanban se atualiza na hora. Erro de transição mostra a mensagem do domínio.
- **ADM-RF-11** — Clicar no card abre um Sheet de detalhes: itens com observação e preço, observações do pedido, endereço, telefone, pagamento (status efetivo, copia-e-cola com botão copiar, expiração, pago em), criado e atualizado em.
- **ADM-RF-12** — O alerta `PAGO_APOS_CANCELAMENTO` aparece como badge vermelho "Pago após cancelamento — estornar manualmente" no card e no Sheet.

### Cardápio
- **ADM-RF-13** — `/admin/cardapio` lista as categorias na ordem, com seus itens: nome, descrição, preço formatado e switch de disponibilidade.
- **ADM-RF-14** — Criar e editar **categoria** (nome único, ordem ≥ 0).
- **ADM-RF-15** — Criar e editar **item**: nome, descrição, preço digitado em reais ("25,90", convertido por `parseReais`), categoria e disponível. Validação zod com mensagens em PT-BR; preço > 0; nome único dentro da categoria.
- **ADM-RF-16** — O switch de disponibilidade altera na hora (ação otimista, revertida em caso de erro).
- **ADM-RF-17** — Excluir item pede confirmação. Pedidos antigos continuam com o snapshot do nome e do preço, porque a FK é `set null`. Excluir uma categoria só é possível se ela estiver vazia; caso contrário, a mensagem explica.

### Loja
- **ADM-RF-18** — O cabeçalho tem o switch "Loja aberta / fechada", que grava em `configuracoes.loja_aberta`. O efeito no bot é imediato, porque o contexto é lido a cada mensagem.
- **ADM-RF-19** — O layout `/admin` tem navegação Pedidos | Cardápio, o nome da loja, o switch da loja e o botão Sair. A raiz `/admin` redireciona para `/admin/pedidos`.

## Requisitos não funcionais
- **ADM-RNF-01** — Responsivo: usável em tablet (kanban com rolagem horizontal) e no celular.
- **ADM-RNF-02** — Tudo em PT-BR; valores em R$; datas relativas em PT-BR.
- **ADM-RNF-03** — Nenhum dado do admin sem sessão: as server actions validam a sessão mesmo que alguém chame direto.
- **ADM-RNF-04** — Existe um roteiro E2E automatizado e opcional, `pnpm e2e:admin`. Ele usa `playwright-core` com o Chrome instalado na máquina e percorre CA-02 e CA-04 a CA-09, além da responsividade. Usa telefone `teste:`, para não disparar notificações, e apaga o item que cria.

## Critérios de aceite
- **CA-01** — Dado que estou sem sessão, quando acesso `/admin/pedidos`, então vou para `/login`. Quando chamo `/api/admin/pedidos`, recebo 401.
- **CA-02** — Dadas credenciais erradas, quando faço login, então vejo "E-mail ou senha inválidos" e nenhum cookie é criado. Com as credenciais certas, entro no kanban.
- **CA-03** — Dado um JWT expirado ou assinado com outra chave, quando acesso o admin, então volto ao login.
- **CA-04** — Dado um pedido criado pela API do bot, quando espero até 5 s, então ele aparece em "Aguardando pagamento" sem recarregar a página.
- **CA-05** — Dado um pedido aguardando com o provedor mock, quando clico em "Simular pagamento", então ele vai para "Pagos — novos", com destaque. Com o som ativado, toca o bipe.
- **CA-06** — Dado um pedido de retirada em "Em preparo", quando clico em Avançar, então o rótulo era "Pronto para retirada" e o pedido vai para "Saiu / Pronto".
- **CA-07** — Dado que crio um item "Coxinha" a R$ "7,50", então ele aparece no cardápio com preço 750 centavos e já está no `cardapioTexto` do bot.
- **CA-08** — Dado que desligo a disponibilidade de X-Bacon, quando o bot revisa um pedido com X-Bacon, então recebe o erro de indisponível.
- **CA-09** — Dado que fecho a loja, quando o bot tenta criar um pedido, então recebe `LOJA_FECHADA`.
- **CA-10** — Dados dois cliques rápidos em "Iniciar preparo", então apenas uma transição acontece e o segundo clique recebe uma mensagem amigável.
- **CA-12** — Dado o kanban:
  - em 1920×1080 e 1280×800, as 5 colunas têm a mesma largura e juntas ocupam toda a largura útil (sem sobra à direita), vão até o fim da janela, a página não rola na vertical, e nenhum card fica espremido (a lista de cards rola);
  - em 390 px, cada coluna tem ~88% da largura da tela.
- **CA-13** — Dado o kanban aberto e parado por 12 s (com o som desligado e depois ligado), então ele faz no máximo 4 requisições a `/api/admin/pedidos` (a inicial + uma a cada 5 s), e não uma a cada render.
- **CA-11** — Dada uma categoria de nome longo (ex.: "Pizzas Tradicionais — Grande, 8 fatias"), quando edito um item em 1400 px ou 390 px, então nenhum campo do diálogo ultrapassa a caixa, e o nome da categoria é truncado com reticências.

## Fora de escopo
Vários usuários ou perfis, edição de configurações além do switch da loja, impressão, relatórios, upload de imagens, drag-and-drop no kanban.

## Histórico
- 2026-10-16 — versão inicial.
- 2026-10-16 — Verificação no navegador encontrou e corrigiu 3 defeitos:
  - o e-mail era apagado depois de um login com erro, por causa do reset automático de formulário do React 19 (agora o e-mail volta no estado da action);
  - o toast no canto superior direito cobria o switch "Loja aberta" (os toasts foram para baixo);
  - o cabeçalho transbordava em 390px (agora quebra linha).

  Incluído o ADM-RNF-04 (E2E automatizado), porque o usuário pediu explicitamente uma PoC testável.
- 2026-10-22 — Defeito relatado pelo usuário: com os nomes longos de categoria da pizzaria, o seletor de categoria do diálogo "Editar item" ultrapassava a caixa. A causa era a célula de grid sem `min-w-0` mais o `whitespace-nowrap` do SelectTrigger. Incluído o CA-11, verificado no `e2e:admin`.
- 2026-10-22 — Pedido do usuário: as colunas do kanban devem ocupar 100% da tela de forma responsiva. Antes, as colunas tinham largura fixa (288 px), sobrava espaço à direita em telas largas e o cabeçalho ficava limitado a 1600 px. Incluídos o layout responsivo no ADM-RF-06 e o CA-12.
- 2026-10-22 — Defeito achado na demo pública (011): o kanban pedia `/api/admin/pedidos` cerca de 2 vezes por segundo, em vez de a cada 5 s. O `useBipe` devolvia um objeto novo a cada render; isso recriava o `recarregar` e reiniciava o efeito do polling, que busca na hora. Na Vercel, isso multiplicava as invocações e as leituras do Turso. Incluído o CA-13.
