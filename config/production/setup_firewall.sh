#!/bin/bash
# CamTraffic firewall setup using ufw
set -e

echo "🔥 Configuring UFW firewall for CamTraffic..."

# Reset firewall to default
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH access (change port if needed)
ufw allow 22/tcp comment 'SSH'

# HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Application port (if accessed directly)
ufw allow from 127.0.0.1 to any port 8000 comment 'Django app (localhost only)'

# Database (PostgreSQL) - restrict to local network
ufw allow from 192.168.0.0/16 to any port 5432 comment 'PostgreSQL'
ufw allow from 172.16.0.0/12 to any port 5432 comment 'PostgreSQL'
ufw allow from 10.0.0.0/8 to any port 5432 comment 'PostgreSQL'

# Redis - restrict to localhost
ufw allow from 127.0.0.1 to any port 6379 comment 'Redis (localhost only)'

# Enable firewall
ufw --force enable

echo "✅ Firewall configured successfully"
ufw status verbose
