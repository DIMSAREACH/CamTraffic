"""Default admin system setting keys (empty JSON until saved in System Settings UI)."""

DEFAULT_SYSTEM_SETTING_KEYS: tuple[str, ...] = (
    'general_config',
    'ai_config',
    'camera_config',
    'traffic_config',
    'vehicle_config',
    'email_config',
    'sms_config',
    'notification_config',
    'security_config',
    'api_config',
    'theme_admin_config',
    'language_admin_config',
)

DEFAULT_SETTING_DESCRIPTIONS: dict[str, str] = {
    'general_config': 'General system settings',
    'ai_config': 'AI runtime configuration',
    'camera_config': 'Camera defaults',
    'traffic_config': 'Traffic configuration',
    'vehicle_config': 'Vehicle configuration',
    'email_config': 'Email configuration',
    'sms_config': 'SMS configuration',
    'notification_config': 'Notification settings',
    'security_config': 'Security policy',
    'api_config': 'API & integration',
    'theme_admin_config': 'Admin theme preset',
    'language_admin_config': 'Admin nav language overrides',
}
