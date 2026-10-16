# Contrato — API do Bot (`/api/bot/*`)

- **Autenticação:** header `x-api-key: <BOT_API_KEY>` em todas as rotas.
- **Formato:** JSON UTF-8. Valores monetários vêm **sempre** em dois campos: o formatado (`"R$ 25,90"`) e o em centavos (`*Centavos`).

---

## `GET /api/bot/contexto?telefone=5511999990000`

**200**
```json
{
  "ok": true,
  "restaurante": {
    "nome": "Burger Demo",
    "lojaAberta": true,
    "horario": "Todos os dias, 18h às 23h",
    "tempoEstimado": "40–50 min",
    "taxaEntrega": "R$ 5,00",
    "taxaEntregaCentavos": 500,
    "aceitaRetirada": true,
    "enderecoRetirada": "Rua Exemplo, 123 – Centro"
  },
  "cardapioTexto": "## Lanches\n[id 1] X-Burguer — R$ 25,90 — Pão, carne 150g, queijo\n...",
  "cliente": { "nome": "Ana", "ultimoEndereco": "Rua das Flores, 45 – apto 12" },
  "pedidosRecentes": [
    { "numero": "#0012", "status": "em_preparo", "statusTexto": "Em preparo", "total": "R$ 49,90", "criadoEm": "2026-10-16T21:10:00.000Z" }
  ]
}
```
**400** `{ "ok": false, "erros": ["Informe o parâmetro telefone."] }`

---

## `POST /api/bot/pedidos/revisar`

**Request**
```json
{
  "itens": [ { "itemId": 3, "quantidade": 1, "observacao": "sem cebola" }, { "itemId": 8, "quantidade": 2 } ],
  "tipoEntrega": "entrega",
  "endereco": "Rua das Flores, 45 – apto 12"
}
```
`itens` também pode chegar como string JSON. Aliases aceitos: `item_id`/`id`, `qtd`, `obs`, `tipo_entrega`.

**200**
```json
{
  "ok": true,
  "linhas": [
    { "itemId": 3, "nome": "X-Bacon", "quantidade": 1, "observacao": "sem cebola", "precoUnitario": "R$ 31,90", "subtotal": "R$ 31,90", "subtotalCentavos": 3190 },
    { "itemId": 8, "nome": "Coca-Cola Lata", "quantidade": 2, "observacao": null, "precoUnitario": "R$ 6,50", "subtotal": "R$ 13,00", "subtotalCentavos": 1300 }
  ],
  "subtotal": "R$ 44,90", "subtotalCentavos": 4490,
  "taxaEntrega": "R$ 5,00", "taxaEntregaCentavos": 500,
  "total": "R$ 49,90", "totalCentavos": 4990,
  "resumoTexto": "1x X-Bacon (sem cebola) — R$ 31,90\n2x Coca-Cola Lata — R$ 13,00\nTaxa de entrega — R$ 5,00\n*Total: R$ 49,90*"
}
```
**422**
```json
{ "ok": false, "codigo": "ITENS_INVALIDOS", "erros": ["O item de id 99 não existe no cardápio. Use apenas IDs do cardápio.", "X-Salada (id 2) está indisponível no momento."] }
```
**409** `{ "ok": false, "codigo": "LOJA_FECHADA", "erros": ["A loja está fechada agora. Horário: Todos os dias, 18h às 23h."] }`

---

## `POST /api/bot/pedidos`

**Request:** o mesmo corpo de `revisar`, mais:
```json
{ "telefone": "5511999990000", "nomeCliente": "Ana", "observacoes": "Interfone quebrado, ligar ao chegar" }
```

**201** (novo) / **200** (deduplicado, `"duplicado": true`)
```json
{
  "ok": true,
  "duplicado": false,
  "pedido": {
    "id": 13, "numero": "#0013", "status": "aguardando_pagamento", "statusTexto": "Aguardando pagamento",
    "tipoEntrega": "entrega", "total": "R$ 49,90", "totalCentavos": 4990, "resumoTexto": "…"
  },
  "pix": {
    "copiaECola": "00020126…6304ABCD",
    "expiraEm": "2026-10-16T21:40:00.000Z",
    "validadeTexto": "30 minutos"
  }
}
```
- **422 / 409:** como em `revisar`.
- **502:**
  ```json
  { "ok": false, "codigo": "PIX_INDISPONIVEL", "erros": ["Pedido #0013 registrado, mas não consegui gerar o Pix agora. Tente confirmar de novo em instantes."], "pedido": { "id": 13, "numero": "#0013" } }
  ```
- **400:**
  ```json
  { "ok": false, "codigo": "FORMATO_INVALIDO", "erros": ["Campo 'itens' ausente. Exemplo: {\"itens\":[{\"itemId\":1,\"quantidade\":2}],\"tipoEntrega\":\"retirada\"}"] }
  ```

---

## `GET /api/bot/pedidos?telefone=5511999990000`

**200**
```json
{
  "ok": true,
  "pedidos": [
    {
      "numero": "#0013", "status": "aguardando_pagamento", "statusTexto": "Aguardando pagamento",
      "total": "R$ 49,90", "itensResumo": "1x X-Bacon, 2x Coca-Cola Lata", "criadoEm": "2026-10-16T21:10:00.000Z",
      "pix": { "copiaECola": "00020126…6304ABCD", "expirado": false }
    }
  ]
}
```

---

## Erros comuns a todas as rotas
| HTTP | Corpo |
|---|---|
| 401 | `{ "ok": false, "erro": "Não autorizado" }` |
| 500 | `{ "ok": false, "erro": "Erro interno, tente novamente." }` |
