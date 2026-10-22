# Configurar o WhatsApp (Cloud API oficial da Meta)

Este guia liga o atendente ao WhatsApp usando o **número de teste gratuito** da Meta. Leva uns 20 minutos.

> **Limites do número de teste**
> - Ele só conversa com até **5 números verificados por você**.
> - O bot responde livremente dentro da **janela de 24 h**, contada a partir da última mensagem do cliente. É sempre o caso aqui, porque o bot só responde e avisa status logo depois do pedido.
>
> A interface da Meta muda com frequência: se algum nome de menu não bater, procure o equivalente.

## 1. Criar o app
1. Acesse <https://developers.facebook.com/apps> → **Criar app**.
2. Caso de uso **Outro** → tipo **Empresa (Business)** → dê um nome (ex.: *Container Lanches PoC*).
3. Em **Adicionar produtos**, escolha **WhatsApp → Configurar**. A Meta cria uma conta do WhatsApp Business e um **número de teste**.

## 2. Copiar os IDs e o token
Em **WhatsApp → Configuração da API (API Setup)**:

| Na tela da Meta | No `.env` |
|---|---|
| *Phone number ID* | `WHATSAPP_PHONE_NUMBER_ID` |
| *WhatsApp Business Account ID* | `WHATSAPP_BUSINESS_ACCOUNT_ID` |
| *Temporary access token* (vale 24 h) | `WHATSAPP_ACCESS_TOKEN` |

**Token permanente** (recomendado, porque o temporário expira em 24 h):
1. Em <https://business.facebook.com/settings>: **Usuários → Usuários do sistema → Adicionar** (função Admin).
2. **Atribuir ativos**: o app e a conta do WhatsApp, com controle total.
3. **Gerar token**: escolha o app, marque `whatsapp_business_messaging` e `whatsapp_business_management` e a validade **Nunca**.
4. Coloque o token em `WHATSAPP_ACCESS_TOKEN`.

## 3. Cadastrar quem pode testar (até 5 números)
Na mesma tela, no campo **Para (To)** → **Gerenciar lista de números** → adicione o seu celular com DDI (ex.: `+55 11 99999-0000`) e confirme o código que chega no WhatsApp.

## 4. App Secret e Verify Token
- **App Secret:** em **Configurações do app → Básico → Chave secreta do app**, clique em "Mostrar" e copie para `WHATSAPP_APP_SECRET`. O Next.js usa esse valor para validar a assinatura `X-Hub-Signature-256` de cada webhook.
- **Verify Token:** qualquer texto que você escolher. O `.env` gerado já traz um em `WHATSAPP_VERIFY_TOKEN`.

## 5. Subir o túnel público
1. Crie uma conta gratuita em <https://dashboard.ngrok.com>.
2. Copie o **Authtoken** para `NGROK_AUTHTOKEN`.
3. Em **Domains**, pegue o seu **domínio estático gratuito** (ex.: `meu-burger.ngrok-free.app`) e coloque em `NGROK_DOMAIN`.
4. Rode:
   ```bash
   pnpm dev           # Next.js em :3000
   pnpm infra:up      # n8n + Postgres
   pnpm n8n:import    # atualiza a credencial do WhatsApp no n8n com o token do .env
   pnpm tunel:up      # https://<NGROK_DOMAIN> → localhost:3000
   ```
5. Confira: abrir `https://<NGROK_DOMAIN>/` no navegador mostra a página da Container Lanches. O ngrok exibe um aviso antes, só para navegadores; as chamadas da Meta não passam por ele.

## 6. Configurar o webhook na Meta
Em **WhatsApp → Configuração (Configuration) → Webhook → Editar**:
- **URL de callback:** `https://<NGROK_DOMAIN>/api/webhooks/whatsapp`
- **Token de verificação:** o valor de `WHATSAPP_VERIFY_TOKEN`
- Clique em **Verificar e salvar**. O Next.js responde ao desafio; se falhar, veja o log do `pnpm dev`.
- Em **Campos do webhook**, **assine `messages`**.

## 7. Testar
1. Do celular cadastrado, mande **"oi"** para o número de teste.
2. O caminho percorrido:
   - Meta → `https://<NGROK_DOMAIN>/api/webhooks/whatsapp`, onde o Next.js valida e deduplica;
   - → n8n, workflow **WhatsApp Entrada**;
   - → **Agente Restaurante**;
   - → resposta no seu WhatsApp.
3. Faça um pedido e confirme. O código Pix chega numa **mensagem separada**.
4. No painel (`/admin/pedidos`), clique em **Simular pagamento**. Chega "✅ Pagamento confirmado…".
5. Avance os status no painel. Cada etapa gera um aviso no WhatsApp.

As execuções aparecem em `http://localhost:5678` → **Executions**.

## Problemas comuns
| Sintoma | Causa provável | Solução |
|---|---|---|
| "Verificar e salvar" falha | Túnel fora do ar ou token diferente | `pnpm tunel:up`; confira `WHATSAPP_VERIFY_TOKEN`; olhe o log do Next.js |
| Next.js loga 401 no webhook | `WHATSAPP_APP_SECRET` errado | Copie de novo a chave secreta do app (passo 4) |
| Mensagem chega no n8n, mas a resposta não chega ao celular | Token expirado (erro 190) | Gere o token permanente (passo 2) e rode `pnpm n8n:import` |
| Erro *Recipient phone number not in allowed list* (131030) | O número não está na lista de teste **no mesmo formato** do `wa_id` | Celulares brasileiros podem chegar **sem o 9º dígito** (ex.: `55 11 9999-0000`). Cadastre o número no formato que aparece em `telefone` na execução do n8n |
| Nada acontece ao mandar "oi" | Campo `messages` não assinado, ou número fora da lista | Revise os passos 3 e 6 |
| Aviso só depois de 24 h sem mensagem do cliente | Fora da janela de 24 h | Templates aprovados estão fora do escopo da PoC |
