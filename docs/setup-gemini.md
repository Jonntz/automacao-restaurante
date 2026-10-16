# Configurar o Gemini (IA do atendente)

O agente do n8n usa o **Google Gemini no free tier**. Não precisa de cartão de crédito.

> ⚠️ No free tier, o Google pode usar os prompts e as respostas para melhorar os modelos (exceto na UE, na Suíça e no Reino Unido). Use **apenas dados fictícios** na PoC.

## 1. Criar a chave
1. Acesse <https://aistudio.google.com/apikey> com uma conta Google.
2. Clique em **Create API key** e copie a chave. Ela começa com `AIza…`, ou com `AQ.…` no formato novo.
3. No `.env` da raiz:
   ```env
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-flash-lite-latest
   GEMINI_MODEL_RESERVA=gemini-3.1-flash-lite
   ```
4. Se o n8n já estiver rodando, atualize a credencial: `pnpm n8n:import`.

## 2. Escolher o modelo
| `GEMINI_MODEL` | Quando usar |
|---|---|
| `gemini-flash-lite-latest` (padrão de `GEMINI_MODEL`) | Alias do Flash-Lite atual (em out/2026, o 3.5-flash-lite). Tem a **maior cota diária** do free tier (~500 req/dia) e chama ferramentas bem |
| `gemini-3.1-flash-lite` (padrão de `GEMINI_MODEL_RESERVA`) | Reserva com **cota própria**: entra quando o principal dá 503 ou 429 |
| `gemini-flash-latest` | Melhor qualidade (em out/2026, o 3.8-flash), mas com só **20 req/dia** no free tier: bom para uma demonstração curta |
| Uma versão fixa (ex.: `gemini-3.5-flash`) | Comportamento estável entre testes, mas pode ser descontinuada. Em 2026-10-16 o `gemini-2.5-flash` já respondia 404 para usuários novos |

O nome vai para o nó como `models/<GEMINI_MODEL>`. Depois de mudar o valor, rode `docker compose up -d` para recriar o n8n com a variável nova. Confira os modelos disponíveis para a sua chave em **AI Studio → Get code** ou na lista de modelos.

## 3. Limites do free tier
Os limites são **por projeto, por modelo e por dia**, e mudam com frequência. Em 16/10/2026, a chave usada no desenvolvimento recebeu `429 … limit: 20` no `gemini-3.8-flash` (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). Os guias de set/2026 apontam ~500/dia para os Flash-Lite. Os números exatos da sua chave aparecem em **AI Studio → Usage / Rate limits**.

Cada mensagem do cliente consome **1 requisição + 1 por ferramenta chamada**:
- conversa simples: 1 requisição;
- revisar o pedido: +1;
- confirmar o pedido: +1.

O contexto (cardápio, loja e cliente) já entra no prompt e não gasta requisição (ADR-06).

Se o modelo principal falhar, o agente usa o **modelo reserva** (`GEMINI_MODEL_RESERVA`, padrão `gemini-3.1-flash-lite`). Como a cota é por modelo, o reserva também soma capacidade. Além disso, o nó tenta de novo até 2 vezes, o que cobre picos de demanda (erro 503). Se a cota estourar (erro 429) ou o erro persistir, o cliente recebe a mensagem de fallback ("tive um probleminha técnico…") e o workflow não quebra.

## 4. Trocar para Groq (Llama) se preferir
O Groq também tem free tier e suporta chamada de ferramentas:
1. Crie a chave em <https://console.groq.com/keys>.
2. Na UI do n8n (`http://localhost:5678`), em **Credentials → New → Groq**, cole a chave.
3. Abra o workflow **Agente Restaurante**, apague o nó **Gemini**, adicione **Groq Chat Model** (modelo `llama-3.3-70b-versatile`) e ligue-o à entrada *Chat Model* do nó **Atendente**.
4. Salve, publique e rode `pnpm n8n:export` para levar a mudança para o git.

Não é preciso mudar o prompt nem as ferramentas (IA-RNF-03).
