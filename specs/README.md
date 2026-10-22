# Specs — Automação de Restaurante (PoC)

Este diretório é a **fonte da verdade** do projeto. Usamos Spec-Driven Development (SDD) no estilo do GitHub Spec Kit: primeiro escrevemos *o quê* e *por quê*, depois *como*, depois as tarefas. O código só vem depois disso.

## Como ler

| Arquivo | Para que serve |
|---|---|
| [constitution.md](constitution.md) | Princípios inegociáveis. Toda spec, plano e PR deve respeitá-los. |
| [arquitetura.md](arquitetura.md) | Visão do sistema: componentes, fronteiras, fluxos, decisões (ADRs) e variáveis de ambiente. |
| [ROADMAP.md](ROADMAP.md) | Ordem das features, dependências e progresso. |
| `NNN-feature/spec.md` | **O quê e por quê**: histórias, requisitos (`XXX-RF-NN`), critérios de aceite (`CA-NN`), casos de borda, fora de escopo. |
| `NNN-feature/plan.md` | **Como**: design técnico, arquivos, contratos, decisões locais e riscos. |
| `NNN-feature/tasks.md` | **Passo a passo**: tarefas numeradas e rastreáveis até os requisitos. |
| `data-model.md`, `contracts/` | Detalhes que mais de uma feature consome. |

## Features

| # | Feature | Prefixo | Resumo |
|---|---|---|---|
| 001 | [fundacao](001-fundacao/spec.md) | FUN | Scaffold, banco, schema, seed, utilitários, testes |
| 002 | [cardapio-e-pedidos](002-cardapio-e-pedidos/spec.md) | PED | Cardápio, cálculo, criação, status e notificações |
| 003 | [pagamento-pix](003-pagamento-pix/spec.md) | PAG | Provedores Pix (mock/AbacatePay), confirmação idempotente, webhook |
| 004 | [api-do-bot](004-api-do-bot/spec.md) | BOT | API HTTP que o agente do n8n consome |
| 005 | [painel-admin](005-painel-admin/spec.md) | ADM | Login, kanban de pedidos, cardápio, loja aberta |
| 006 | [n8n-infra](006-n8n-infra/spec.md) | INF | Docker compose, bootstrap do n8n, túnel |
| 007 | [agente-ia](007-agente-ia/spec.md) | IA | Agente Gemini no n8n e o Chat Teste |
| 008 | [whatsapp](008-whatsapp/spec.md) | WPP | Gateway do webhook da Meta, entrada e envio de mensagens |
| 009 | [entrega-poc](009-entrega-poc/spec.md) | ENT | README, guias, deploy, troubleshooting, verificação E2E |
| 010 | [marca-e-pizzaria](010-marca-e-pizzaria/spec.md) | MRC | Identidade visual Container Lanches (claro/escuro) e cardápio de pizzaria |

## Convenções

- **Requisitos:** `PED-RF-03` (funcional) e `PED-RNF-01` (não funcional). Os IDs nunca são reaproveitados. Requisito removido fica riscado: `~~PED-RF-09~~ (removido: motivo)`.
- **Critérios de aceite:** `CA-NN`, no formato **Dado / Quando / Então**.
- **Tarefas:** `T002.05`, em que a parte antes do ponto é a feature e a depois é a sequência. Formato:

  ```
  - [ ] T002.05 [P] TESTE: descrição — PED-RF-03
        Arquivo: tests/... · Depende de: T002.01 · Pronto quando: ...
  ```

  - **Tipos:** `SETUP`, `TESTE`, `IMPL`, `REFACTOR`, `DOC`, `VERIF`.
  - `[P]` marca tarefa que pode rodar em paralelo com as vizinhas (não mexe nos mesmos arquivos).
  - Toda regra de domínio vem em par: `TESTE` (falha pelo motivo certo) e depois `IMPL` (o teste passa).
  - Toda feature termina com uma tarefa `VERIF`, que passa por cada CA.
- **Status no ROADMAP:** ⬜ não iniciada · 🟨 em andamento · ✅ concluída · ⛔ bloqueada.

## Fluxo de trabalho

1. Antes de codar, leia a `constitution.md` e as três peças da feature: spec, plan e tasks.
2. Execute as tarefas na ordem e marque `[x]` assim que cada uma ficar pronta.
3. Se a implementação revelar que a spec está errada ou incompleta, **atualize a spec primeiro**, registrando o motivo no fim do arquivo (seção "Histórico"), e só depois altere o código.
4. Ao concluir a feature, rode a tarefa `VERIF`, atualize o ROADMAP e faça um commit `feat(NNN): ...`.
