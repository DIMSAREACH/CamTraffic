#!/usr/bin/env bash
set -euo pipefail

# Provision Ubuntu 22.04 VPS for CamTraffic production (Task 217 prerequisites).
# Run as root or with sudo.
# Usage:
#   sudo ./deploy/scripts/provision_vps_ubuntu.sh

echo "Updating packages..."
apt-get update -y
apt-get upgrade -y

echo "Installing base dependencies..."
apt-get install -y \
  ca-certificates curl gnupg lsb-release git unzip ufw cron

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker Engine..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

systemctl enable docker
systemctl start docker

# Firewall defaults and open SSH/HTTP/HTTPS.
ufw --force default deny incoming
ufw --force default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "VPS provisioning complete."
echo "Recommended minimum for Task 217: >=4 CPU and >=8GB RAM"
