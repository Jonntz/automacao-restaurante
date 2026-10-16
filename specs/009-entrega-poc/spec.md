# 009 — Entrega da PoC (documentação, deploy e verificação final)

## Objetivo
Deixar a PoC **testável por outra pessoa**:
- um README com dois caminhos: rápido, sem contas externas, e completo, com WhatsApp e AbacatePay;
- os guias de setup e de deploy gratuito;
- o troubleshooting;
- um roteiro E2E executado e registrado.

## Histórias
- **H1.** Como avaliador, quero em ~15 min ver um pedido feito por IA cair no painel, sem criar conta em lugar nenhum além do Google AI Studio.
- **H2.** Como dev, quero o passo a passo completo para ligar o WhatsApp de teste e o Pix do AbacatePay.
- **H3.** Como dev, quero saber como colocar isso online sem pagar.

## Requisitos funcionais
- **ENT-RF-01** — `README.md` com:
  - o que é;
  - o diagrama resumido (link para `specs/arquitetura.md`);
  - os pré-requisitos (Node 22, pnpm, Docker);
  - o **Caminho rápido**: `.env` com `PAGAMENTO_PROVEDOR=mock`, só a `GEMINI_API_KEY`, `pnpm i`, `db:reset`, `dev`, `infra:up`, criar o dono do n8n, abrir o Chat Teste, fazer um pedido, ver no admin, simular o pagamento;
  - o **Caminho completo**: túnel, Meta, AbacatePay;
  - a tabela de scripts;
  - a estrutura de pastas;
  - como as specs funcionam (link para `specs/README.md`);
  - as versões fixadas.
- **ENT-RF-02** — `docs/setup-abacatepay.md` cobre:
  - criar a conta;
  - ativar o Dev mode;
  - gerar a chave de API com as permissões `TRANSPARENT:CREATE` e `TRANSPARENT:READ`;
  - configurar `.env` (`PAGAMENTO_PROVEDOR=abacatepay`, `ABACATEPAY_API_KEY`, `ABACATEPAY_WEBHOOK_SECRET`);
  - criar o webhook em Dev mode com a URL `https://<NGROK_DOMAIN>/api/webhooks/abacatepay?webhookSecret=<segredo>`;
  - testar com o botão "Simular pagamento".
- **ENT-RF-03** — `docs/deploy.md` (gratuito) cobre:
  - **Next.js na Vercel Hobby**, com o aviso de que esse plano é para uso não comercial;
  - **Turso**: `turso db create`, token, `DATABASE_URL`/`DATABASE_AUTH_TOKEN` e migrations rodadas apontando para o Turso;
  - **n8n + Postgres numa VM Always Free da Oracle Cloud**, com o mesmo `docker-compose.yml`, Caddy para HTTPS e um subdomínio gratuito (DuckDNS ou sslip.io). Ajustes:
    - `N8N_URL` passa a ser `https://n8n.<domínio>`;
    - `NEXT_API_URL` passa a ser a URL da Vercel;
    - o n8n continua sem expor a UI publicamente (acesso por túnel SSH);
    - os webhooks internos são protegidos pelo segredo;
  - **Meta** e **AbacatePay** apontando para a URL da Vercel;
  - o checklist de variáveis por ambiente.
- **ENT-RF-04** — `docs/troubleshooting.md`, com sintoma → causa → solução, para:
  - erro 429 do Gemini;
  - token da Meta expirado;
  - 9º dígito do Brasil e destinatário fora da lista;
  - webhook da Meta sem verificação;
  - assinatura inválida;
  - ngrok com sessão ou domínio errado;
  - `host.docker.internal` no Linux;
  - workflow não publicado;
  - Pix que não confirma (usar "Verificar pagamento");
  - Postgres Chat Memory sem tabela;
  - `$fromAI` mandando o corpo vazio;
  - Vercel Hobby comercial.
- **ENT-RF-05** — `docs/verificacao-e2e.md`: roteiro consolidado com os CAs manuais das features 005, 007 e 008, mais as colunas data, ambiente, resultado e observações, preenchidas na execução final.
- **ENT-RF-07** — `pnpm env:init` cria o `.env` a partir do `.env.example`:
  - gera segredos aleatórios (sessão, chaves internas, senha do Postgres, chave do n8n, senha do admin);
  - **nunca** sobrescreve um `.env` existente;
  - mostra no terminal o login do painel.
- **ENT-RF-06** — `CLAUDE.md` na raiz: como trabalhar neste repo (ler a constitution e a spec antes, marcar as tasks, atualizar a spec antes do código, comandos principais).

## Requisitos não funcionais
- **ENT-RNF-01** — `pnpm typecheck && pnpm lint && pnpm test && pnpm build` passam no estado final.
- **ENT-RNF-02** — Nenhum segredo real versionado; `git grep` pelos prefixos de chave conhecidos não encontra nada.

## Critérios de aceite
- **CA-01** — Dado um clone limpo, quando sigo só o Caminho rápido do README, então completo um pedido pelo Chat Teste e o vejo como "Pago" no admin depois de simular.
- **CA-02** — Dado o roteiro E2E, então cada linha tem resultado registrado. As que dependem de credenciais externas ausentes ficam marcadas como "pendente de credenciais", com a instrução de como completar.
- **CA-03** — Dado o comando de verificação final (ENT-RNF-01), então a saída é verde.
- **CA-04** — Dada uma busca por padrões com o tamanho real de chaves (`AIza[0-9A-Za-z_-]{35}`, `AQ\.[0-9A-Za-z_-]{40,}`, `EAA[A-Za-z0-9]{30,}`, `abc_(dev|prod)_[0-9A-Za-z]{16,}`, `sk_(live|test)_…`) nos arquivos versionados, então nada é encontrado, e `.env` e `local.db` não estão no git. Os testes usam valores falsos curtos, como `AIza-teste`, de propósito.

## Fora de escopo
Vídeo de demonstração, site institucional, monitoramento.

## Histórico
- 2026-10-16 — versão inicial.
- 2026-10-16 — Incluído o ENT-RF-07 (`pnpm env:init`), para o caminho rápido não exigir gerar segredos à mão.
