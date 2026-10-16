# Constituição do Projeto

Princípios inegociáveis. Quando uma decisão técnica entra em conflito com algum deles, quem vence é a constituição. Para mudar um princípio, é preciso registrar o motivo na seção "Emendas".

## I. A IA nunca define dinheiro
O agente de IA só informa **IDs de itens, quantidades e observações**. Preço unitário, subtotal, taxa e total são sempre calculados no servidor (Next.js) a partir do banco. Qualquer preço que chegue numa requisição do bot é ignorado. O valor da cobrança Pix é sempre o `total_centavos` gravado no pedido.

## II. Dinheiro em centavos inteiros
Todo valor monetário é `INTEGER` em centavos, no banco, no código e nos contratos. Não existe `float` em cálculo financeiro. A formatação "R$ 25,90" acontece só na borda (UI, textos para o LLM).

## III. TDD na lógica de domínio
Regras de negócio (cálculo, status, pagamento, autenticação, parsing de webhooks) nascem de um teste que falha. UI e workflows do n8n são verificados com roteiros manuais documentados; o código dentro de nós do n8n que tenha lógica é testado extraindo o código do JSON do workflow.

## IV. Só camadas gratuitas na PoC
Modelos (Gemini no free tier), banco (libSQL/Turso free), WhatsApp (número de teste da Meta), Pix (AbacatePay em modo dev), túnel (ngrok free) e n8n self-hosted. Para incluir algo pago é preciso emendar a constituição.

## V. Segredos só no `.env`
Nenhuma chave, token ou senha vai para o git, para os logs ou para o JSON dos workflows. O `.env.example` lista todas as variáveis com valores fictícios. As credenciais do n8n são geradas a partir do `.env` pelo bootstrap.

## VI. Webhooks autenticados, idempotentes e desconfiados
Todo webhook recebido valida a origem (HMAC ou segredo compartilhado) e é idempotente (deduplicação por ID do evento). Quando houver API de consulta, o payload é tratado só como *gatilho*: o estado real é buscado de novo no provedor.

## VII. PT-BR para quem usa
Interface do admin, mensagens ao cliente, erros devolvidos ao LLM e documentação, tudo em português do Brasil. Identificadores de código também em português, por consistência com o domínio. Exceções: termos consagrados (`id`, `status`, `webhook`).

## VIII. YAGNI
Só entra o que uma spec pede. Ideias novas vão para "Fora de escopo" ou para uma nova feature no ROADMAP, nunca de carona numa tarefa.

## IX. Rastreabilidade
Toda tarefa referencia o requisito que atende, e todo requisito tem pelo menos uma tarefa e um critério de aceite. Commits citam a feature (`feat(002): ...`).

## X. Fronteiras claras
- **Next.js** é dono das regras de negócio, do banco e do painel.
- **n8n** é dono da conversa (LLM, memória, ferramentas) e do envio de WhatsApp.
- O n8n nunca acessa o banco da aplicação diretamente; ele só usa a API do bot.
- O Next.js nunca fala com a API da Meta para enviar mensagens; ele pede ao n8n.

---

## Emendas
_Nenhuma até agora._
