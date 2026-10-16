# Configurar o Gemini (IA do atendente)

O agente do n8n usa o **Google Gemini no free tier**. Não precisa de cartão de crédito.

> ⚠️ No free tier, o Google pode usar os prompts e as respostas para melhorar os modelos (exceto na UE, na Suíça e no Reino Unido). Use **apenas dados fictícios** na PoC.

## 1. Criar a chave
1. Acesse <https://aistudio.google.com/apikey> com uma conta Google.
2. Clique em **Create API key** e copie a chave (começa com `AIza…`).
3. No `.env` da raiz:
   ```env
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-2.5-flash
   ```
4. Se o n8n já estiver rodando, atualize a credencial: `pnpm n8n:import`.

## 2. Escolher o modelo
| `GEMINI_MODEL` | Quando usar |
|---|---|
| `gemini-2.5-flash` (padrão) | Melhor equilíbrio entre qualidade e uso de ferramentas no free tier |
| `gemini-2.5-flash-lite` (ou o Flash-Lite mais novo) | Se você estiver batendo no limite de requisições por minuto |
| Flash mais novo listado no AI Studio | Pode trocar à vontade: o nó do n8n lê o nome do modelo da variável |

O nome vai para o nó como `models/<GEMINI_MODEL>`. Confira os modelos disponíveis para a sua chave em **AI Studio → Get code** ou na lista de modelos.

## 3. Limites do free tier
Os limites são **por projeto** e mudam com frequência. Em 2026 ficavam por volta de **10–15 requisições por minuto** e **algumas centenas por dia** para o Flash. Os números exatos da sua chave aparecem em **AI Studio → Usage / Rate limits**.

Cada mensagem do cliente consome **1 requisição + 1 por ferramenta chamada**:
- conversa simples: 1 requisição;
- revisar o pedido: +1;
- confirmar o pedido: +1.

O contexto (cardápio, loja e cliente) já entra no prompt e não gasta requisição (ADR-06).

Quando a cota estoura (erro 429), o cliente recebe a mensagem de fallback ("tive um probleminha técnico…") e o workflow não quebra.

## 4. Trocar para Groq (Llama) se preferir
O Groq também tem free tier e suporta chamada de ferramentas:
1. Crie a chave em <https://console.groq.com/keys>.
2. Na UI do n8n (`http://localhost:5678`), em **Credentials → New → Groq**, cole a chave.
3. Abra o workflow **Agente Restaurante**, apague o nó **Gemini**, adicione **Groq Chat Model** (modelo `llama-3.3-70b-versatile`) e ligue-o à entrada *Chat Model* do nó **Atendente**.
4. Salve, publique e rode `pnpm n8n:export` para levar a mudança para o git.

Não é preciso mudar o prompt nem as ferramentas (IA-RNF-03).
