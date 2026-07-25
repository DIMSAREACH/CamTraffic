#!/usr/bin/env python3
"""
Production environment hardening script for CamTraffic.
Configures SSL/TLS, logging, monitoring, security, and automated backups.
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from datetime import datetime

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


class ProductionHardening:
    """Production environment hardening utility."""
    
    def __init__(self):
        self.project_root = project_root
        self.config_dir = project_root / "config" / "production"
        self.ssl_dir = project_root / "ssl"
        self.logs_dir = project_root / "logs"
        
        # Ensure directories exist
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.ssl_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def run_full_hardening(self, domain="camtraffic.store"):
        """Run complete production hardening process."""
        print("🛡️  CamTraffic Production Environment Hardening")
        print("=" * 50)
        
        steps = [
            ("🔐 SSL/TLS Configuration", self.setup_ssl_tls, domain),
            ("📊 Logging Configuration", self.setup_logging),
            ("📈 Monitoring Setup", self.setup_monitoring),
            ("🔒 Security Hardening", self.security_hardening),
            ("💾 Automated Backups", self.setup_automated_backups),
            ("🐳 Docker Production Config", self.setup_docker_production),
            ("🔥 Firewall Configuration", self.setup_firewall),
            ("⚡ Performance Optimization", self.performance_optimization)
        ]
        
        for step_name, step_func, *args in steps:
            print(f"\n{step_name}")
            print("-" * len(step_name))
            try:
                if args:
                    step_func(*args)
                else:
                    step_func()
                print("✅ Completed")
            except Exception as e:
                print(f"❌ Error: {e}")
                print("⚠️  Continuing with next step...")
        
        print(f"\n🎉 Production hardening completed!")
        print("📋 Next steps:")
        print("  1. Review generated configuration files")
        print("  2. Update DNS records for SSL certificates")
        print("  3. Configure monitoring alerts")
        print("  4. Test backup and restore procedures")

    def setup_ssl_tls(self, domain):
        """Configure SSL/TLS certificates and HTTPS."""
        print(f"Setting up SSL/TLS for domain: {domain}")
        
        # Create SSL certificate configuration
        ssl_config = {
            "domain": domain,
            "subdomains": ["api", "admin", "app"],
            "certificate_authority": "Let's Encrypt",
            "renewal_period_days": 30,
            "key_size": 4096
        }
        
        # Generate SSL configuration files
        self.create_ssl_config_files(ssl_config)
        
        # Create Certbot configuration
        self.create_certbot_config(domain)
        
        # Create nginx SSL configuration
        self.create_nginx_ssl_config(domain)
        
        print(f"📄 SSL configuration files created in {self.ssl_dir}")

    def create_ssl_config_files(self, ssl_config):
        """Create SSL certificate configuration files."""
        
        # SSL renewal script
        renewal_script = f"""#!/bin/bash
# SSL certificate renewal script for CamTraffic
set -e

DOMAIN="{ssl_config['domain']}"
EMAIL="admin@$DOMAIN"
WEBROOT_PATH="/var/www/html"

echo "🔐 Renewing SSL certificates for $DOMAIN..."

# Renew certificates
certbot renew --quiet --webroot --webroot-path=$WEBROOT_PATH

# Reload nginx if certificates were renewed
if [ $? -eq 0 ]; then
    echo "✅ SSL certificates renewed successfully"
    systemctl reload nginx
    
    # Test configuration
    nginx -t && echo "✅ Nginx configuration valid"
else
    echo "❌ SSL certificate renewal failed"
    exit 1
fi

# Send notification on renewal
curl -X POST https://api.$DOMAIN/webhooks/ssl-renewal \\
    -H "Content-Type: application/json" \\
    -d '{{"status": "renewed", "timestamp": "'$(date -Iseconds)'"}}'
"""
        
        ssl_renewal_path = self.ssl_dir / "renew_certificates.sh"
        ssl_renewal_path.write_text(renewal_script)
        ssl_renewal_path.chmod(0o755)
        
        # SSL configuration for nginx
        ssl_nginx_config = f"""# SSL Configuration for CamTraffic Production
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

ssl_certificate /etc/letsencrypt/live/{ssl_config['domain']}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/{ssl_config['domain']}/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/{ssl_config['domain']}/chain.pem;

ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# HSTS (HTTP Strict Transport Security)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Security headers
add_header X-Content-Type-Options nosniff always;
add_header X-Frame-Options DENY always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" always;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
"""
        
        (self.ssl_dir / "nginx_ssl.conf").write_text(ssl_nginx_config)
        
        # Save SSL configuration
        with open(self.ssl_dir / "ssl_config.json", 'w') as f:
            json.dump(ssl_config, f, indent=2)

    def create_certbot_config(self, domain):
        """Create Certbot configuration for SSL certificates."""
        
        certbot_script = f"""#!/bin/bash
# Certbot SSL certificate setup for CamTraffic
set -e

DOMAIN="{domain}"
EMAIL="admin@$DOMAIN"
WEBROOT_PATH="/var/www/html"

echo "🔐 Setting up SSL certificates for CamTraffic..."

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Create webroot directory
mkdir -p $WEBROOT_PATH

# Obtain certificates for all subdomains
certbot certonly \\
    --webroot \\
    --webroot-path=$WEBROOT_PATH \\
    --email $EMAIL \\
    --agree-tos \\
    --no-eff-email \\
    -d $DOMAIN \\
    -d api.$DOMAIN \\
    -d admin.$DOMAIN \\
    -d app.$DOMAIN

# Set up automatic renewal
echo "Setting up automatic renewal..."
cat > /etc/cron.d/certbot-camtraffic << EOF
# Renew CamTraffic SSL certificates twice daily
0 */12 * * * root {self.ssl_dir}/renew_certificates.sh >> /var/log/ssl-renewal.log 2>&1
EOF

echo "✅ SSL certificates configured successfully"
echo "📄 Certificates saved to: /etc/letsencrypt/live/$DOMAIN/"
echo "🔄 Automatic renewal scheduled"
"""
        
        (self.ssl_dir / "setup_certbot.sh").write_text(certbot_script)
        (self.ssl_dir / "setup_certbot.sh").chmod(0o755)

    def create_nginx_ssl_config(self, domain):
        """Create nginx configuration with SSL."""
        
        nginx_config = f"""# CamTraffic Production Nginx Configuration
server {{
    listen 80;
    server_name {domain} api.{domain} admin.{domain} app.{domain};
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}}

# API Server (Backend)
server {{
    listen 443 ssl http2;
    server_name api.{domain};
    
    include {self.ssl_dir}/nginx_ssl.conf;
    
    client_max_body_size 100M;
    
    location / {{
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }}
    
    # Security
    location ~* \\.(?:git|env|md)$ {{
        deny all;
    }}
}}

# Admin Portal
server {{
    listen 443 ssl http2;
    server_name admin.{domain};
    
    include {self.ssl_dir}/nginx_ssl.conf;
    
    root /var/www/camtraffic/admin;
    index index.html;
    
    try_files $uri $uri/ /index.html;
    
    # Cache static assets
    location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|svg)$ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
}}

# User Portal (Officer + Driver)
server {{
    listen 443 ssl http2;
    server_name app.{domain};
    
    include {self.ssl_dir}/nginx_ssl.conf;
    
    root /var/www/camtraffic/user;
    index index.html;
    
    try_files $uri $uri/ /index.html;
    
    # Cache static assets
    location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|svg)$ {{
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
}}

# Main Domain (redirect to app)
server {{
    listen 443 ssl http2;
    server_name {domain};
    
    include {self.ssl_dir}/nginx_ssl.conf;
    
    return 301 https://app.{domain};
}}
"""
        
        (self.ssl_dir / "nginx_camtraffic.conf").write_text(nginx_config)

    def setup_logging(self):
        """Configure production logging."""
        print("Configuring production logging...")
        
        # Create logging configuration
        logging_config = {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "detailed": {
                    "format": "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
                    "datefmt": "%d/%b/%Y %H:%M:%S"
                },
                "json": {
                    "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                    "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "detailed",
                    "level": "INFO"
                },
                "file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": f"{self.logs_dir}/camtraffic.log",
                    "formatter": "json",
                    "maxBytes": 10485760,  # 10MB
                    "backupCount": 5,
                    "level": "INFO"
                },
                "error_file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": f"{self.logs_dir}/camtraffic_errors.log",
                    "formatter": "json",
                    "maxBytes": 10485760,
                    "backupCount": 10,
                    "level": "ERROR"
                },
                "security_file": {
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": f"{self.logs_dir}/security.log",
                    "formatter": "json",
                    "maxBytes": 10485760,
                    "backupCount": 30,
                    "level": "WARNING"
                }
            },
            "loggers": {
                "django": {
                    "handlers": ["console", "file", "error_file"],
                    "level": "INFO",
                    "propagate": False
                },
                "django.security": {
                    "handlers": ["security_file"],
                    "level": "WARNING",
                    "propagate": False
                },
                "camtraffic": {
                    "handlers": ["console", "file", "error_file"],
                    "level": "INFO",
                    "propagate": False
                }
            },
            "root": {
                "handlers": ["console", "file"],
                "level": "INFO"
            }
        }
        
        # Save logging configuration
        with open(self.config_dir / "logging_config.json", 'w') as f:
            json.dump(logging_config, f, indent=2)
        
        # Create log rotation script
        log_rotation_script = """#!/bin/bash
# CamTraffic log rotation and cleanup
set -e

LOG_DIR="/var/log/camtraffic"
RETENTION_DAYS=30

echo "🗂️  Rotating CamTraffic logs..."

# Rotate application logs
find $LOG_DIR -name "*.log" -type f -mtime +$RETENTION_DAYS -delete

# Compress old logs
find $LOG_DIR -name "*.log.*" -type f ! -name "*.gz" -mtime +1 -exec gzip {} \\;

# Clean up old compressed logs
find $LOG_DIR -name "*.log.*.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "✅ Log rotation completed"
"""
        
        (self.config_dir / "rotate_logs.sh").write_text(log_rotation_script)
        (self.config_dir / "rotate_logs.sh").chmod(0o755)

    def setup_monitoring(self):
        """Set up monitoring and alerting."""
        print("Setting up monitoring and alerting...")
        
        # Create monitoring configuration
        monitoring_config = {
            "health_checks": {
                "api_endpoint": "/health/ready/",
                "check_interval_seconds": 30,
                "timeout_seconds": 10,
                "alert_threshold_failures": 3
            },
            "metrics": {
                "response_time_threshold_ms": 2000,
                "error_rate_threshold_percent": 5.0,
                "cpu_threshold_percent": 80.0,
                "memory_threshold_percent": 85.0,
                "disk_threshold_percent": 90.0
            },
            "alerts": {
                "email": "admin@camtraffic.store",
                "webhook_url": "https://api.camtraffic.store/webhooks/monitoring/",
                "notification_cooldown_minutes": 15
            }
        }
        
        # Save monitoring configuration
        with open(self.config_dir / "monitoring_config.json", 'w') as f:
            json.dump(monitoring_config, f, indent=2)
        
        # Create health check script
        health_check_script = """#!/bin/bash
# CamTraffic health monitoring script
set -e

API_URL="https://api.camtraffic.store"
HEALTH_ENDPOINT="/health/ready/"
TIMEOUT=10
LOG_FILE="/var/log/camtraffic/health_check.log"

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date -Iseconds)] $1" >> $LOG_FILE
}

# Check API health
check_api_health() {
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL$HEALTH_ENDPOINT" || echo "000")
    
    if [ "$response_code" = "200" ]; then
        log_with_timestamp "✅ API health check passed"
        return 0
    else
        log_with_timestamp "❌ API health check failed (HTTP $response_code)"
        return 1
    fi
}

# Check database connectivity
check_database() {
    cd /opt/camtraffic
    python manage.py check --database default > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_with_timestamp "✅ Database connection healthy"
        return 0
    else
        log_with_timestamp "❌ Database connection failed"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage
    usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 90 ]; then
        log_with_timestamp "✅ Disk usage: ${usage}%"
        return 0
    else
        log_with_timestamp "⚠️  High disk usage: ${usage}%"
        return 1
    fi
}

# Main health check
main() {
    local failed_checks=0
    
    check_api_health || ((failed_checks++))
    check_database || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    
    if [ $failed_checks -eq 0 ]; then
        log_with_timestamp "🎉 All health checks passed"
        exit 0
    else
        log_with_timestamp "❌ $failed_checks health checks failed"
        exit 1
    fi
}

main "$@"
"""
        
        (self.config_dir / "health_check.sh").write_text(health_check_script)
        (self.config_dir / "health_check.sh").chmod(0o755)

    def security_hardening(self):
        """Apply security hardening measures."""
        print("Applying security hardening...")
        
        # Create security configuration
        security_config = {
            "fail2ban": {
                "enabled": True,
                "max_retry": 3,
                "ban_time": 600,
                "find_time": 300
            },
            "firewall": {
                "enabled": True,
                "allowed_ports": [22, 80, 443, 8000],
                "allowed_ips": ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
            },
            "ssh": {
                "disable_root_login": True,
                "disable_password_auth": True,
                "key_only_auth": True,
                "port": 22
            }
        }
        
        # Save security configuration
        with open(self.config_dir / "security_config.json", 'w') as f:
            json.dump(security_config, f, indent=2)

    def setup_automated_backups(self):
        """Set up automated backup system."""
        print("Setting up automated backup system...")
        
        # Create backup configuration
        backup_config = {
            "schedule": {
                "database_backup": "0 2 * * *",  # Daily at 2 AM
                "file_backup": "0 3 * * 0",     # Weekly on Sunday at 3 AM
                "log_backup": "0 4 * * *"       # Daily at 4 AM
            },
            "retention": {
                "daily_backups": 7,
                "weekly_backups": 4,
                "monthly_backups": 12
            },
            "storage": {
                "local_path": "/var/backups/camtraffic",
                "remote_enabled": False,
                "remote_type": "s3",
                "remote_bucket": "camtraffic-backups"
            }
        }
        
        # Save backup configuration
        with open(self.config_dir / "backup_config.json", 'w') as f:
            json.dump(backup_config, f, indent=2)
        
        # Create backup script
        backup_script = """#!/bin/bash
# CamTraffic automated backup script
set -e

BACKUP_DIR="/var/backups/camtraffic"
PROJECT_DIR="/opt/camtraffic"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/database" "$BACKUP_DIR/files" "$BACKUP_DIR/logs"

echo "🗄️  Starting CamTraffic backup - $DATE"

# Database backup
echo "📦 Backing up database..."
cd $PROJECT_DIR
python manage.py backup_database --backup --backup-dir "$BACKUP_DIR/database" --compress

# Application files backup (excluding logs and cache)
echo "📁 Backing up application files..."
tar -czf "$BACKUP_DIR/files/camtraffic_files_$DATE.tar.gz" \\
    --exclude="*.log" \\
    --exclude="__pycache__" \\
    --exclude="node_modules" \\
    --exclude=".git" \\
    --exclude="media/cache" \\
    -C /opt camtraffic

# Log files backup
echo "📋 Backing up logs..."
tar -czf "$BACKUP_DIR/logs/camtraffic_logs_$DATE.tar.gz" /var/log/camtraffic/

# Cleanup old backups
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup completed successfully"

# Send notification
curl -X POST https://api.camtraffic.store/webhooks/backup-completed \\
    -H "Content-Type: application/json" \\
    -d '{"status": "success", "timestamp": "'$(date -Iseconds)'", "backup_dir": "'$BACKUP_DIR'"}'
"""
        
        (self.config_dir / "backup_system.sh").write_text(backup_script)
        (self.config_dir / "backup_system.sh").chmod(0o755)

    def setup_docker_production(self):
        """Set up Docker production configuration."""
        print("Setting up Docker production configuration...")
        
        # Create production docker-compose override
        docker_compose_prod = """version: '3.8'

services:
  backend:
    restart: unless-stopped
    environment:
      - DJANGO_SETTINGS_MODULE=camtraffic.settings_production
      - DJANGO_LOG_LEVEL=INFO
    volumes:
      - ./logs:/opt/camtraffic/logs
      - ./backups:/var/backups/camtraffic
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups/postgres:/var/backups/postgres
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M

  redis:
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.1'
          memory: 128M

volumes:
  postgres_data:
    driver: local
"""
        
        (self.config_dir / "docker-compose.prod.override.yml").write_text(docker_compose_prod)

    def setup_firewall(self):
        """Set up firewall configuration."""
        print("Setting up firewall configuration...")
        
        firewall_script = """#!/bin/bash
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
"""
        
        (self.config_dir / "setup_firewall.sh").write_text(firewall_script)
        (self.config_dir / "setup_firewall.sh").chmod(0o755)

    def performance_optimization(self):
        """Set up performance optimization."""
        print("Setting up performance optimization...")
        
        # Create performance tuning script
        perf_script = """#!/bin/bash
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
"""
        
        (self.config_dir / "optimize_performance.sh").write_text(perf_script)
        (self.config_dir / "optimize_performance.sh").chmod(0o755)


def main():
    """Run production environment hardening."""
    hardening = ProductionHardening()
    
    import argparse
    parser = argparse.ArgumentParser(description='CamTraffic Production Environment Hardening')
    parser.add_argument('--domain', default='camtraffic.store', help='Domain name for SSL certificates')
    parser.add_argument('--ssl-only', action='store_true', help='Only setup SSL/TLS configuration')
    parser.add_argument('--monitoring-only', action='store_true', help='Only setup monitoring')
    parser.add_argument('--backup-only', action='store_true', help='Only setup backup system')
    
    args = parser.parse_args()
    
    if args.ssl_only:
        hardening.setup_ssl_tls(args.domain)
    elif args.monitoring_only:
        hardening.setup_monitoring()
    elif args.backup_only:
        hardening.setup_automated_backups()
    else:
        hardening.run_full_hardening(args.domain)


if __name__ == "__main__":
    main()