#!/usr/bin/env bash
# Prepara a VM Oracle (Ubuntu 24.04) da demo: swap, portas 80/443 e Docker (specs/011-demo-publica DEM-RF-06).
# Roda NA VM e é idempotente. O scripts/vm-deploy.sh envia e executa este arquivo.
set -euo pipefail

# 1. Swap de 2 GB quando há pouca RAM (a E2.1.Micro tem 1 GB; n8n + Postgres passam disso em picos).
mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo)
if [ "$mem_kb" -lt 4000000 ] && ! swapon --show | grep -q '^/swapfile'; then
  echo "[vm] criando swap de 2 GB"
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

# 2. Portas 80/443. A imagem Ubuntu da Oracle termina a chain INPUT com um REJECT:
#    as regras entram antes dele e são persistidas (a Security List da VCN é a outra metade).
rejeita=$(sudo iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" { print $1; exit }')
for porta in 80 443; do
  if ! sudo iptables -C INPUT -p tcp -m state --state NEW --dport "$porta" -j ACCEPT 2>/dev/null; then
    echo "[vm] liberando a porta $porta no iptables"
    sudo iptables -I INPUT "${rejeita:-1}" -p tcp -m state --state NEW --dport "$porta" -j ACCEPT
  fi
done
if ! command -v netfilter-persistent >/dev/null; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq iptables-persistent >/dev/null
fi
sudo netfilter-persistent save >/dev/null 2>&1

# 3. Docker + compose pelos pacotes do Ubuntu (sem executar script baixado da internet).
if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  echo "[vm] instalando Docker"
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io docker-compose-v2 >/dev/null
fi
sudo systemctl enable --now docker >/dev/null 2>&1
echo "[vm] pronta: $(docker --version | cut -d, -f1), $(docker compose version --short 2>/dev/null || echo compose?)"
