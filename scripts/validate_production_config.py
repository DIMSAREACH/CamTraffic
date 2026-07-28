#!/usr/bin/env python3
"""
Validate that production configuration has all demo/mock/sample flags properly disabled.
Run this script to ensure 100% production-ready configuration.
"""

import os
import sys
import json
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def check_backend_env():
    """Check backend environment variables for production compliance."""
    print("🔍 Checking backend environment configuration...")
    
    backend_env = project_root / "src" / "backend" / ".env.production"
    if not backend_env.exists():
        print("❌ Missing backend/.env.production file")
        return False
    
    env_content = backend_env.read_text()
    
    # Check AI configuration
    checks = [
        ("AI_USE_MOCK=False", "AI mock mode disabled"),
        ("AI_PIPELINE_DEMO_VIOLATION=False", "AI demo violations disabled"),
        ("ALLOW_DEMO_SEED=False", "Demo seeding disabled"),
        ("CAMTRAFFIC_SEED_DEMO=False", "Demo seed flag disabled"),
        ("DEBUG=False", "Debug mode disabled"),
        ("USE_SQLITE=False", "SQLite disabled (using PostgreSQL)"),
        ("USE_REDIS=True", "Redis enabled for production"),
        ("PAYMENT_MODE=live", "Live payment mode enabled"),
    ]
    
    all_passed = True
    for check_str, description in checks:
        if check_str in env_content:
            print(f"✅ {description}")
        else:
            print(f"❌ MISSING: {check_str} ({description})")
            all_passed = False
    
    return all_passed

def check_frontend_env(portal_name, env_path):
    """Check frontend environment variables for production compliance."""
    print(f"🔍 Checking {portal_name} frontend configuration...")
    
    if not env_path.exists():
        print(f"❌ Missing {portal_name}/.env.production file")
        return False
    
    env_content = env_path.read_text()
    
    checks = [
        ("VITE_USE_MOCK=false", "Mock API disabled"),
        ("VITE_USE_SAMPLE_FALLBACK=false", "Sample fallback disabled"),
        ("VITE_ALLOW_DEMO_VIOLATION=false", "Demo violations disabled"),
        ("VITE_ALLOW_DEMO_ASSETS=false", "Demo assets disabled"),
    ]
    
    all_passed = True
    for check_str, description in checks:
        if check_str in env_content:
            print(f"✅ {description}")
        else:
            print(f"❌ MISSING: {check_str} ({description})")
            all_passed = False
    
    return all_passed

def check_ai_weights():
    """Check that AI model weights exist."""
    print("🔍 Checking AI model weights...")
    
    weights_dir = project_root / "ai" / "weights"
    required_weights = [
        "best.pt",
        "best_cambodia_vehicles.pt", 
        "best_cambodia_plates.pt"
    ]
    
    all_exist = True
    for weight_file in required_weights:
        weight_path = weights_dir / weight_file
        if weight_path.exists():
            print(f"✅ {weight_file} exists ({weight_path.stat().st_size / 1024 / 1024:.1f} MB)")
        else:
            print(f"❌ MISSING: {weight_file}")
            all_exist = False
    
    return all_exist

def check_camera_configuration():
    """Check camera configuration files and structure."""
    print("🔍 Checking camera configuration...")
    
    camera_config = project_root / "config" / "production_cameras.json"
    
    all_passed = True
    
    if camera_config.exists():
        print("✅ Production camera configuration file exists")
        
        try:
            with open(camera_config, 'r') as f:
                config = json.load(f)
            
            cameras = config.get('cameras', [])
            if cameras:
                print(f"✅ {len(cameras)} production cameras configured")
                
                # Check that cameras don't use demo URLs
                demo_patterns = ['/demo-cameras/', 'picsum.photos', 'placeholder.com', 'example.com']
                for camera in cameras:
                    rtsp_url = camera.get('rtsp_url', '')
                    http_url = camera.get('http_url', '')
                    
                    is_demo = any(pattern in url for pattern in demo_patterns for url in [rtsp_url, http_url])
                    if is_demo:
                        print(f"❌ Camera {camera.get('name', 'Unknown')} uses demo URL")
                        all_passed = False
                    else:
                        print(f"✅ Camera {camera.get('code', 'Unknown')} has production URLs")
            else:
                print("❌ No cameras configured in production_cameras.json")
                all_passed = False
                
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in camera configuration: {e}")
            all_passed = False
        except Exception as e:
            print(f"❌ Error reading camera configuration: {e}")
            all_passed = False
    else:
        print("❌ Production camera configuration file missing")
        all_passed = False
    
    # Check for camera management commands
    camera_commands = [
        "setup_production_cameras.py",
        "monitor_cameras.py"
    ]
    
    for cmd in camera_commands:
        cmd_path = project_root / "src" / "backend" / "infrastructure" / "management" / "commands" / cmd
        if cmd_path.exists():
            print(f"✅ Camera management command: {cmd}")
        else:
            print(f"❌ MISSING: Camera management command: {cmd}")
            all_passed = False
    
    return all_passed

def check_payment_configuration():
    """Check payment system configuration for production."""
    print("🔍 Checking payment system configuration...")
    
    backend_env = project_root / "src" / "backend" / ".env.production"
    if not backend_env.exists():
        print("❌ Missing backend/.env.production file")
        return False
    
    env_content = backend_env.read_text()
    
    all_passed = True
    
    # Check payment mode
    if "PAYMENT_MODE=live" in env_content:
        print("✅ Live payment mode enabled")
    else:
        print("❌ MISSING: PAYMENT_MODE=live")
        all_passed = False
    
    # Check for payment service providers
    has_stripe = "STRIPE_SECRET_KEY=" in env_content and "STRIPE_WEBHOOK_SECRET=" in env_content
    has_aba_payway = "ABA_PAYWAY_API_KEY=" in env_content and "ABA_PAYWAY_MERCHANT_ID=" in env_content
    has_khqr = "KHQR_MERCHANT_NAME=" in env_content and "KHQR_MERCHANT_ACCOUNT=" in env_content
    
    if has_stripe:
        print("✅ Stripe payment configuration found")
    else:
        print("⚠️  Stripe payment not configured")
    
    if has_aba_payway:
        print("✅ ABA PayWay API configuration found")
    else:
        print("⚠️  ABA PayWay API not configured")
    
    if has_khqr:
        print("✅ KHQR payment configuration found")
    else:
        print("⚠️  KHQR payment not configured")
    
    # At least one PSP should be configured for production
    if not (has_stripe or has_aba_payway or has_khqr):
        print("❌ No payment service providers configured")
        all_passed = False
    else:
        print("✅ At least one payment service provider configured")
    
    # Check automated settlement settings
    if "PAYMENT_AUTO_SETTLEMENT=True" in env_content:
        print("✅ Automated settlement enabled")
    else:
        print("⚠️  Automated settlement not enabled")
    
    # Check webhook configuration
    if "ENABLE_TEST_WEBHOOKS=False" in env_content:
        print("✅ Test webhooks disabled in production")
    else:
        print("❌ MISSING: ENABLE_TEST_WEBHOOKS=False")
        all_passed = False
    
    # Check webhook files exist
    webhook_files = [
        "webhook_views.py",
        "webhook_urls.py",
        "services/payment_settlement.py"
    ]
    
    for file in webhook_files:
        file_path = project_root / "src" / "backend" / "fines" / file
        if file_path.exists():
            print(f"✅ Payment webhook file: {file}")
        else:
            print(f"❌ MISSING: {file}")
            all_passed = False
    
    # Check management commands
    reconcile_cmd = project_root / "src" / "backend" / "fines" / "management" / "commands" / "reconcile_payments.py"
    if reconcile_cmd.exists():
        print("✅ Payment reconciliation command exists")
    else:
        print("❌ MISSING: reconcile_payments management command")
        all_passed = False
    
    return all_passed

def check_notification_configuration():
    """Check notification system configuration for production."""
    print("🔍 Checking notification system configuration...")
    
    backend_env = project_root / "src" / "backend" / ".env.production"
    if not backend_env.exists():
        print("❌ Missing backend/.env.production file")
        return False
    
    env_content = backend_env.read_text()
    
    all_passed = True
    
    # Check email configuration
    has_resend = "RESEND_API_KEY=" in env_content and "RESEND_FROM_EMAIL=" in env_content
    has_smtp = all(key in env_content for key in ["EMAIL_HOST=", "EMAIL_HOST_USER=", "EMAIL_HOST_PASSWORD="])
    
    if has_resend:
        print("✅ Resend email service configured")
    elif has_smtp:
        print("✅ SMTP email service configured")
    else:
        print("❌ No email service configured")
        all_passed = False
    
    # Check SMS configuration
    has_twilio = all(key in env_content for key in ["TWILIO_ACCOUNT_SID=", "TWILIO_AUTH_TOKEN=", "TWILIO_FROM_NUMBER="])
    
    if has_twilio:
        print("✅ Twilio SMS service configured")
    else:
        print("⚠️  SMS service not configured")
    
    # Check push notification configuration
    has_fcm = "FCM_SERVER_KEY=" in env_content and "FCM_PROJECT_ID=" in env_content
    has_web_push = "VAPID_PUBLIC_KEY=" in env_content and "VAPID_PRIVATE_KEY=" in env_content
    
    if has_fcm:
        print("✅ Firebase Cloud Messaging configured")
    else:
        print("⚠️  FCM push notifications not configured")
    
    if has_web_push:
        print("✅ Web Push notifications configured")
    else:
        print("⚠️  Web Push notifications not configured")
    
    # Check notification management command
    test_cmd = project_root / "src" / "backend" / "notifications" / "management" / "commands" / "test_notifications.py"
    if test_cmd.exists():
        print("✅ Notification testing command exists")
    else:
        print("❌ MISSING: test_notifications management command")
        all_passed = False
    
    # At least email should be configured for production
    if not (has_resend or has_smtp):
        print("❌ Email notifications are critical for production")
        all_passed = False
    
    # Overall notification health
    notification_channels = sum([has_resend or has_smtp, has_twilio, has_fcm, has_web_push])
    print(f"📊 {notification_channels}/4 notification channels configured")
    
    if notification_channels >= 3:
        print("✅ Excellent notification coverage")
    elif notification_channels >= 2:
        print("⚡ Good notification coverage")
    else:
        print("⚠️  Limited notification coverage - consider configuring more channels")
    
    return all_passed

def check_database_configuration():
    """Check database configuration for production."""
    print("🔍 Checking database configuration...")
    
    backend_env = project_root / "src" / "backend" / ".env.production"
    if not backend_env.exists():
        print("❌ Missing backend/.env.production file")
        return False
    
    env_content = backend_env.read_text()
    
    all_passed = True
    
    # Check PostgreSQL configuration
    if "USE_SQLITE=False" in env_content:
        print("✅ PostgreSQL mode enabled")
    else:
        print("❌ MISSING: USE_SQLITE=False")
        all_passed = False
    
    # Check Redis configuration
    if "USE_REDIS=True" in env_content:
        print("✅ Redis cache enabled")
    else:
        print("❌ MISSING: USE_REDIS=True")
        all_passed = False
    
    # Check database credentials are configured
    db_configs = ["DB_NAME=", "DB_USER=", "DB_PASSWORD=", "DB_HOST=", "DB_PORT="]
    for config in db_configs:
        if config in env_content:
            print(f"✅ Database configuration: {config.replace('=', '')}")
        else:
            print(f"❌ MISSING: {config.replace('=', '')}")
            all_passed = False
    
    # Check database management commands
    db_commands = [
        "setup_production_database.py",
        "secure_database.py", 
        "backup_database.py"
    ]
    
    for cmd in db_commands:
        cmd_path = project_root / "src" / "backend" / "core" / "management" / "commands" / cmd
        if cmd_path.exists():
            print(f"✅ Database management command: {cmd}")
        else:
            print(f"❌ MISSING: Database management command: {cmd}")
            all_passed = False
    
    # Check for demo data removal
    if "ALLOW_DEMO_SEED=False" in env_content:
        print("✅ Demo data seeding disabled")
    else:
        print("❌ MISSING: ALLOW_DEMO_SEED=False")
        all_passed = False
    
    return all_passed

def check_environment_hardening():
    """Check environment hardening configuration."""
    print("🔍 Checking environment hardening configuration...")
    
    all_passed = True
    
    # Check SSL configuration
    ssl_dir = project_root / "ssl"
    ssl_files = [
        "ssl_config.json",
        "nginx_ssl.conf",
        "nginx_camtraffic.conf",
        "setup_certbot.sh",
        "renew_certificates.sh"
    ]
    
    if ssl_dir.exists():
        print("✅ SSL directory exists")
        for ssl_file in ssl_files:
            file_path = ssl_dir / ssl_file
            if file_path.exists():
                print(f"✅ SSL configuration: {ssl_file}")
            else:
                print(f"❌ MISSING: SSL configuration: {ssl_file}")
                all_passed = False
    else:
        print("❌ SSL directory not found")
        all_passed = False
    
    # Check production configuration
    config_dir = project_root / "config" / "production"
    config_files = [
        "logging_config.json",
        "monitoring_config.json",
        "backup_config.json",
        "security_config.json",
        "docker-compose.prod.override.yml"
    ]
    
    if config_dir.exists():
        print("✅ Production config directory exists")
        for config_file in config_files:
            file_path = config_dir / config_file
            if file_path.exists():
                print(f"✅ Production config: {config_file}")
            else:
                print(f"❌ MISSING: Production config: {config_file}")
                all_passed = False
    else:
        print("❌ Production config directory not found")
        all_passed = False
    
    # Check scripts
    hardening_scripts = [
        "health_check.sh",
        "backup_system.sh",
        "setup_firewall.sh",
        "optimize_performance.sh",
        "rotate_logs.sh"
    ]
    
    for script in hardening_scripts:
        script_path = config_dir / script
        if script_path.exists():
            print(f"✅ Hardening script: {script}")
        else:
            print(f"❌ MISSING: Hardening script: {script}")
            all_passed = False
    
    # Check main hardening script
    hardening_main = project_root / "scripts" / "harden_production_environment.py"
    if hardening_main.exists():
        print("✅ Main hardening script exists")
    else:
        print("❌ MISSING: Main hardening script")
        all_passed = False
    
    return all_passed

def main():
    """Run all production configuration checks."""
    print("🚀 CamTraffic Production Configuration Validator")
    print("=" * 50)
    
    all_passed = True
    
    # Check backend environment
    if not check_backend_env():
        all_passed = False
    print()
    
    # Check admin frontend environment  
    admin_env = project_root / "src" / "web" / "admin" / ".env.production"
    if not check_frontend_env("Admin Portal", admin_env):
        all_passed = False
    print()
    
    # Check user frontend environment
    user_env = project_root / "src" / "web" / "user" / ".env.production" 
    if not check_frontend_env("User Portal", user_env):
        all_passed = False
    print()
    
    # Check AI weights
    if not check_ai_weights():
        all_passed = False
    print()
    
    # Check camera configuration
    if not check_camera_configuration():
        all_passed = False
    print()
    
    # Check payment configuration
    if not check_payment_configuration():
        all_passed = False
    print()
    
    # Check notification configuration
    if not check_notification_configuration():
        all_passed = False
    print()
    
    # Check database configuration
    if not check_database_configuration():
        all_passed = False
    print()
    
    # Check environment hardening
    if not check_environment_hardening():
        all_passed = False
    print()
    
    # Final verdict
    if all_passed:
        print("🎉 SUCCESS: All production configuration checks passed!")
        print("✅ System is ready for 100% production deployment")
        return 0
    else:
        print("❌ FAILED: Some production configuration checks failed")
        print("🔧 Please fix the issues above before deploying to production")
        return 1

if __name__ == "__main__":
    sys.exit(main())