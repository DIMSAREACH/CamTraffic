#!/usr/bin/env bash
# Ubuntu 22.04/24.04 VPS bootstrap for CamTraffic production.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash infrastructure/deploy/scripts/provision_vps_ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git ufw fail2ban

# Docker Engine + Compose plugin
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Firewall — SSH + HTTP/S
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p /opt/camtraffic
echo "Provision complete. Clone repo to /opt/camtraffic and run:"
echo "  bash infrastructure/deploy/scripts/deploy_production.sh"
