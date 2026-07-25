#!/bin/bash
# CamTraffic performance optimization
set -e

echo "⚡ Optimizing system performance for CamTraffic..."

# Kernel parameters for web server
cat > /etc/sysctl.d/99-camtraffic.conf << EOF
# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3

# File system
fs.file-max = 100000
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

# Apply kernel parameters
sysctl -p /etc/sysctl.d/99-camtraffic.conf

# PostgreSQL optimization
cat > /etc/postgresql/*/main/conf.d/camtraffic.conf << EOF
# CamTraffic PostgreSQL optimization
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
max_connections = 100
EOF

echo "✅ Performance optimization completed"
echo "🔄 Restart required for some changes to take effect"
