#!/bin/sh
# Importa credenciais + workflows do repositório e publica os que têm gatilho (INF-RF-04).
# Idempotente: reimportar sobrescreve pelos mesmos IDs.
set -e
DIR=/projeto-n8n
CRED=/tmp/credenciais.json
trap 'rm -f "$CRED"' EXIT

echo "[bootstrap] gerando credenciais a partir do .env"
node "$DIR/bootstrap/render-credentials.js" "$CRED"
n8n import:credentials --input="$CRED"

if ls "$DIR"/workflows/*.json >/dev/null 2>&1; then
  echo "[bootstrap] importando workflows"
  n8n import:workflow --separate --input="$DIR/workflows"
  for id in $(node "$DIR/bootstrap/publicaveis.js" "$DIR/workflows"); do
    echo "[bootstrap] publicando $id"
    n8n publish:workflow --id="$id" || echo "[bootstrap] aviso: não consegui publicar $id; publique pela UI do n8n"
  done
else
  echo "[bootstrap] nenhum workflow em $DIR/workflows"
fi
echo "[bootstrap] concluído"
