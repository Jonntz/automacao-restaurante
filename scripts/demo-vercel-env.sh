#!/usr/bin/env bash
# Grava as variáveis de produção do projeto na Vercel a partir do .env.demo.local, sem imprimir valores
# (specs/011-demo-publica DEM-RF-08). Pré-requisito: `vercel login` e `vercel link` na raiz do repo.
# Uso: pnpm demo:vercel-env            (todas)
#      pnpm demo:vercel-env N8N_URL    (só as indicadas)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_DEMO=.env.demo.local
[ -f "$ENV_DEMO" ] || { echo "✖ $ENV_DEMO não encontrado"; exit 1; }
val() { grep -E "^$1=" "$ENV_DEMO" | tail -1 | cut -d= -f2- || true; }

TODAS=(APP_URL DATABASE_URL DATABASE_AUTH_TOKEN ADMIN_EMAIL ADMIN_PASSWORD SESSION_SECRET BOT_API_KEY
  N8N_URL N8N_WEBHOOK_SECRET PAGAMENTO_PROVEDOR ABACATEPAY_DEV_MODE ENABLE_EXPERIMENTAL_COREPACK)
if [ $# -gt 0 ]; then VARS=("$@"); else VARS=("${TODAS[@]}"); fi

for k in "${VARS[@]}"; do
  case $k in
    N8N_URL) d=$(val N8N_DOMINIO); v=${d:+https://$d} ;;
    ENABLE_EXPERIMENTAL_COREPACK) v=1 ;; # a Vercel usa o pnpm do "packageManager" (pnpm 11)
    *) v=$(val "$k") ;;
  esac
  if [ -z "$v" ]; then
    echo "⏭  $k vazio no $ENV_DEMO (pulei)"
    continue
  fi
  vercel env rm "$k" production --yes >/dev/null 2>&1 || true
  printf '%s' "$v" | vercel env add "$k" production >/dev/null
  echo "✔ $k"
done
