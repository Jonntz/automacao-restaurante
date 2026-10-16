# 007 — Plano técnico

## Arquivos
```
n8n/prompts/atendente.md                 # system prompt (fonte da verdade), com expressões n8n {{ }}
n8n/workflows/agente-restaurante.json    # sub-workflow
n8n/workflows/chat-teste.json
scripts/smoke-chat.ts
tests/n8n/
  helpers.ts                             # carregarWorkflow(slug), acharNo(wf, nome), executarCode(jsCode, itens)
  agente-restaurante.test.ts             # CA-01…CA-04
docs/setup-gemini.md
```

## Desenho do sub-workflow "Agente Restaurante"
```
[When Executed by Another Workflow]  inputs: telefone, nome, texto
        │
[HTTP: Buscar contexto]  GET {{$env.NEXT_API_URL}}/api/bot/contexto?telefone={{ $json.telefone }}  (cred api-bot)
        │
[AI Agent]  prompt (user) = {{ $('When Executed by Another Workflow').item.json.texto }}
            systemMessage = conteúdo de atendente.md (lê $('Buscar contexto').item.json.*)
   ├─ ai_languageModel: [Google Gemini Chat Model] model={{$env.GEMINI_MODEL}}, temperature 0.3
   ├─ ai_memory:        [Postgres Chat Memory] sessionKey={{ $('When Executed…').item.json.telefone }}, contextWindowLength 20
   └─ ai_tool:          [revisar_pedido] [criar_pedido] [consultar_pedidos]  (HTTP Request Tool)
        │ (main)                              │ (error output)
[Code: Montar mensagens]               [Set: Fallback] mensagens=[…]
```

## Ferramentas (HTTP Request Tool)
| Nome | Método/URL | Corpo / query |
|---|---|---|
| revisar_pedido | POST `{{$env.NEXT_API_URL}}/api/bot/pedidos/revisar` | `itens` = `$fromAI('itens', '<descrição + exemplo>', 'json')`, `tipoEntrega` = `$fromAI('tipoEntrega', '"entrega" ou "retirada"', 'string')`, `endereco` = `$fromAI('endereco', '…', 'string')` |
| criar_pedido | POST `{{$env.NEXT_API_URL}}/api/bot/pedidos` | os campos acima + `telefone` = `{{ $('When Executed by Another Workflow').item.json.telefone }}`, `nomeCliente`, `observacoes` via `$fromAI` |
| consultar_pedidos | GET `{{$env.NEXT_API_URL}}/api/bot/pedidos` | query `telefone` = mesma expressão fixa |

- Autenticação: credencial genérica Header Auth `credApiBotDemo01`.
- Opção de resposta "Include full response / Never error" ligada, para que 4xx volte ao agente como texto.

## Decisões
- **Prompt como arquivo:** o teste CA-03 compara o `systemMessage` do JSON com `atendente.md`. Na hora de editar, a regra é editar o `.md` e copiar para o workflow (ou o contrário, e rodar `n8n:export`). O teste pega qualquer divergência.
- **Teste do nó Code:** o helper `executarCode(jsCode, itens)` monta `new Function('$input', 'items', jsCode)` com um `$input.all()` / `$input.first()` falso. O código do nó usa só `$input` e JS puro, sem `require`, para ser executável nos dois ambientes.
- **Plano B para `$fromAI` com JSON:** a API já aceita string JSON (BOT-RF-07). Se o nó HTTP Tool não enviar o corpo direito na versão fixada, trocar por **Call n8n Workflow Tool** com inputs tipados, que chama um mini-workflow HTTP, e registrar a mudança no Histórico da spec.
- **Webhook do Chat Teste:** o `webhookId` fixo fica em `n8n/ids.json` (`chatTesteWebhookId`), e o smoke usa `POST {N8N_URL}/webhook/{webhookId}/chat` com `{ action: "sendMessage", sessionId, chatInput }`.
- **Roteiro do smoke:**
  1. "oi";
  2. "quero 2 x-burguer e 1 coca lata para retirada, meu nome é Teste Smoke";
  3. "sim, pode confirmar".

  Depois, `GET /api/bot/pedidos?telefone=teste:<sessionId>` precisa listar 1 pedido. O script sai com código 1 se não listar, mas o resultado é informativo.

## Riscos
- Limite de requisições por minuto do free tier durante os testes manuais: espaçar as mensagens, ou trocar o `GEMINI_MODEL` para o Flash-Lite.
- O nome do nó de gatilho de sub-workflow pode mudar entre versões. As expressões referenciam o nó pelo nome; se o nome for diferente, atualizar.
