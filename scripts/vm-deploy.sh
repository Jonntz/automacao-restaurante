#!/usr/bin/env bash
# Sobe (ou atualiza) o n8n da demo na VM: postgres + n8n + caddy (specs/011-demo-publica DEM-RF-06).
# Roda na máquina local. Lê VM_IP, VM_CHAVE (caminho da chave SSH), VM_USUARIO (padrão ubuntu)
# e as variáveis do n8n do .env.demo.local. Nenhum valor secreto é impresso.
# Uso: pnpm demo:vm
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_DEMO=.env.demo.local
[ -f "$ENV_DEMO" ] || { echo "✖ $ENV_DEMO não encontrado"; exit 1; }
val() { grep -E "^$1=" "$ENV_DEMO" | tail -1 | cut -d= -f2- || true; }

for v in VM_IP VM_CHAVE APP_URL N8N_DOMINIO GEMINI_API_KEY BOT_API_KEY N8N_WEBHOOK_SECRET POSTGRES_PASSWORD N8N_ENCRYPTION_KEY; do
  [ -n "$(val "$v")" ] || { echo "✖ preencha $v em $ENV_DEMO"; exit 1; }
done
VM_IP=$(val VM_IP)
VM_CHAVE=$(val VM_CHAVE)
VM_CHAVE=${VM_CHAVE/#\~/$HOME}
VM_USUARIO=$(val VM_USUARIO)
VM_USUARIO=${VM_USUARIO:-ubuntu}
APP_URL=$(val APP_URL)
N8N_DOMINIO=$(val N8N_DOMINIO)
[ -f "$VM_CHAVE" ] || { echo "✖ chave SSH não encontrada: $VM_CHAVE"; exit 1; }
chmod 600 "$VM_CHAVE"

# ServerAlive*: sem tráfego (bootstrap silencioso na VM lenta) a conexão caía e o script ficava pendurado.
SSH_OPCOES="-i $VM_CHAVE -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=8"
DESTINO=container-lanches
remoto() { ssh $SSH_OPCOES "$VM_USUARIO@$VM_IP" "$@"; }

# .env da VM: só o que o compose do n8n usa (nada do painel, nada do Turso).
ENV_VM=$(mktemp)
trap 'rm -f "$ENV_VM"' EXIT
chmod 600 "$ENV_VM"
{
  for k in BOT_API_KEY N8N_WEBHOOK_SECRET GEMINI_API_KEY GEMINI_MODEL GEMINI_MODEL_RESERVA \
    POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB N8N_ENCRYPTION_KEY N8N_DOMINIO; do
    echo "$k=$(val "$k")"
  done
  echo "APP_URL=$APP_URL"
  echo "NEXT_API_URL=$APP_URL"
  echo "N8N_WEBHOOK_URL=https://$N8N_DOMINIO/"
} >"$ENV_VM"

echo "→ enviando arquivos para $VM_USUARIO@$VM_IP:~/$DESTINO"
remoto "mkdir -p $DESTINO/infra $DESTINO/n8n"
rsync -az -e "ssh $SSH_OPCOES" docker-compose.yml scripts/vm-provisionar.sh "$VM_USUARIO@$VM_IP:$DESTINO/"
rsync -az --delete -e "ssh $SSH_OPCOES" infra/ "$VM_USUARIO@$VM_IP:$DESTINO/infra/"
rsync -az --delete -e "ssh $SSH_OPCOES" n8n/ "$VM_USUARIO@$VM_IP:$DESTINO/n8n/"
# -a preserva o 600 do arquivo temporário; o chmod garante (o rsync do macOS não aceita --chmod=F600).
rsync -az -e "ssh $SSH_OPCOES" "$ENV_VM" "$VM_USUARIO@$VM_IP:$DESTINO/.env"
remoto "chmod 600 $DESTINO/.env"

echo "→ preparando a VM (swap, firewall, Docker)"
remoto "bash $DESTINO/vm-provisionar.sh"

echo "→ subindo postgres + n8n + caddy"
# up -d cria o que falta; o bootstrap reimporta os workflows do git e o restart faz o n8n carregá-los.
remoto "cd $DESTINO && sudo docker compose --profile publico up -d --remove-orphans \
  && sudo docker compose run --rm n8n-bootstrap >/dev/null \
  && sudo docker compose restart n8n >/dev/null \
  && sudo docker compose --profile publico ps --format '{{.Service}}: {{.State}}'"

echo "✔ n8n da demo em https://$N8N_DOMINIO (só /webhook/* com x-webhook-secret)"
