# Roteiro da apresentação — Container Lanches

Para quem vai apresentar a demonstração ao cliente. Não precisa instalar nada: tudo roda no navegador.

## Links
| O quê | Endereço |
|---|---|
| Página inicial | <https://container-lanches.vercel.app> |
| Chat de pedidos (visão do cliente) | <https://container-lanches.vercel.app/chat> |
| Painel do restaurante | <https://container-lanches.vercel.app/admin> |

O **e-mail e a senha do painel** são enviados à parte. Não estão neste documento.

## Antes de começar (5 minutos antes)
1. Abra o **chat** e o **painel** lado a lado (duas janelas, ou duas telas).
2. No painel, faça login e clique em **Ativar som**, para ouvir o aviso de pedido pago.
3. No chat, mande "oi". Se o atendente responder, está tudo no ar. Recarregue a página do chat para começar a apresentação com a conversa limpa.

## Roteiro sugerido (cerca de 10 minutos)

### 1. O cliente conversa com o atendente
No **chat**:
1. Clique em **Ver o cardápio**. O atendente mostra as pizzas por categoria, com preços.
2. Faça um pedido meio a meio. Pode copiar e colar:
   > Quero uma pizza meia calabresa e meia quatro queijos, com borda de catupiry, para retirada. Meu nome é Carlos.

   O atendente monta o resumo. Ponto para destacar: **a pizza meio a meio é cobrada pelo sabor mais caro**, e o preço vem sempre do sistema, nunca da IA.
3. Confirme: "sim, pode confirmar". O atendente cria o pedido e mostra o **código Pix copia e cola**, com o botão **Copiar código Pix**.

   > É um Pix **de demonstração**: o código não é pagável em nenhum banco. Na versão real, o cliente paga pelo app do banco e o sistema confirma sozinho.

### 2. O restaurante recebe o pedido
No **painel** (a tela atualiza sozinha a cada 5 segundos):
1. O pedido aparece em **Aguardando pagamento**, com o selo TESTE (pedidos vindos deste chat de demonstração).
2. Clique no card para ver os detalhes: itens, observação "meio calabresa / meio quatro queijos", total e cliente.
3. Clique em **Simular pagamento**, que faz o papel do banco confirmando o Pix. O pedido vai para **Pagos — novos**, com destaque e som.

### 3. O cliente pergunta se o pagamento caiu
No **chat**, escreva "já paguei?". O atendente consulta o sistema e confirma que o pagamento foi recebido.

### 4. A cozinha avança o pedido
No **painel**, clique em **Iniciar preparo**, depois em **Pronto para retirada** e depois em **Concluir**.

> No WhatsApp de verdade, o cliente recebe uma mensagem automática a cada etapa ("seu pedido está em preparo", "está pronto"…). Na demonstração pelo chat, esses avisos ficam desligados.

### 5. O restaurante controla o cardápio e o horário
1. Em **Cardápio**, desligue a chave **Disponível** de um sabor. No chat, peça esse sabor: o atendente avisa que está indisponível e oferece outro. Depois, ligue de novo.
2. No topo do painel, desligue **Loja aberta**. No chat, tente fazer um pedido: o atendente informa o horário de funcionamento e não aceita o pedido. **Ligue a loja de novo** ao terminar.

## Se algo der errado
| O que aparece | O que fazer |
|---|---|
| "Nosso atendente está indisponível agora" | Espere 1 minuto e tente de novo. Se continuar, avise o Jonatas: o servidor do atendente ou a cota diária gratuita da IA pode ter acabado. |
| O atendente pede mais informações (nome, retirada ou entrega) | É normal; responda como um cliente responderia. |
| O pedido não aparece no painel | Clique em **Atualizar**, no topo do quadro. |
| O botão **Simular pagamento** não aparece | O Pix daquele pedido expirou (30 minutos). Faça um pedido novo. |
| A resposta demora mais de 20 segundos | A IA gratuita às vezes fica lenta. Aguarde; o sistema tenta de novo sozinho. |

## O que é demonstração e o que muda na versão real
| Na demonstração | Na versão real |
|---|---|
| Chat numa página web | O mesmo atendente no **WhatsApp** do restaurante |
| Pix de mentira + botão "Simular pagamento" | Pix real (AbacatePay), confirmado sozinho quando o cliente paga |
| Avisos de status desligados | Cliente recebe cada mudança de status no WhatsApp |
| Endereço `container-lanches.vercel.app` | Domínio próprio do restaurante |
