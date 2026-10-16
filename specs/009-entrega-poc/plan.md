# 009 — Plano técnico

## Arquivos
```
README.md
CLAUDE.md
docs/
  setup-abacatepay.md
  setup-gemini.md          # (criado em 007, aqui só é linkado)
  setup-meta-whatsapp.md   # (criado em 008, aqui só é linkado)
  deploy.md
  troubleshooting.md
  verificacao-e2e.md       # vai sendo preenchido por 005/007/008 e consolidado aqui
```

## Decisões
- O README é o ponto de entrada; detalhes ficam nos `docs/`, e o "porquê" fica nas `specs/`.
- O Caminho rápido usa o provedor `mock` e o Chat Teste: só exige a chave do Gemini, que é gratuita.
- O deploy é **documentado, não executado**: o usuário escolheu rodar localmente, com o guia como opcional.
- A verificação final roda tudo em sequência e registra o resultado em `verificacao-e2e.md`.

## Riscos
- Mudanças de interface na Meta, na Oracle ou no AbacatePay deixam os guias desatualizados. Por isso cada guia tem data de verificação e links para a documentação oficial.
