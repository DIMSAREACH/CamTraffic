import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Activity,
  ArrowRight,
  Bell,
  Building2,
  Camera,
  Car,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  History,
  Info,
  KeyRound,
  Languages,
  Mail,
  MessageSquare,
  Plug,
  Save,
  Server,
  Settings2,
  Shield,
  TrafficCone,
  Upload,
  UserCog,
  Cpu,
  Code2,
  Monitor,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { Switch } from '@shared/components/ui/switch';
import { LanguageThemeManagementPanel } from '@shared/components/admin/LanguageThemeManagementPanel';
import { useLanguage } from '@shared/context/LanguageContext';
import { auditAPI, dashboardAPI, settingsAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';
import type { AuditLogEntry } from '@shared/types';

type SettingsCategory =
  | 'overview'
  | 'general'
  | 'users'
  | 'ai'
  | 'camera'
  | 'traffic'
  | 'vehicle'
  | 'email'
  | 'sms'
  | 'notifications'
  | 'security'
  | 'language'
  | 'backup'
  | 'audit'
  | 'api'
  | 'system';

type CategoryTone = 'blue' | 'cyan' | 'teal' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';

type CategoryDef = {
  id: SettingsCategory;
  labelKey: string;
  fallback: string;
  icon: typeof Settings2;
  tone: CategoryTone;
  group: 'platform' | 'detection' | 'comms' | 'governance' | 'system';
};

const CATEGORY_GROUPS: { id: CategoryDef['group']; labelKey: string; fallback: string }[] = [
  { id: 'platform', labelKey: 'systemSettings.groupPlatform', fallback: 'Platform' },
  { id: 'detection', labelKey: 'systemSettings.groupDetection', fallback: 'AI & Detection' },
  { id: 'comms', labelKey: 'systemSettings.groupComms', fallback: 'Communications' },
  { id: 'governance', labelKey: 'systemSettings.groupGovernance', fallback: 'Governance' },
  { id: 'system', labelKey: 'systemSettings.groupSystem', fallback: 'System' },
];

const CATEGORIES: CategoryDef[] = [
  { id: 'overview', labelKey: 'systemSettings.catOverview', fallback: 'Overview', icon: Activity, tone: 'blue', group: 'platform' },
  { id: 'general', labelKey: 'systemSettings.catGeneral', fallback: 'General', icon: Building2, tone: 'slate', group: 'platform' },
  { id: 'users', labelKey: 'systemSettings.catUsers', fallback: 'User Settings', icon: UserCog, tone: 'indigo', group: 'platform' },
  { id: 'ai', labelKey: 'systemSettings.catAi', fallback: 'AI Configuration', icon: Cpu, tone: 'cyan', group: 'detection' },
  { id: 'camera', labelKey: 'systemSettings.catCamera', fallback: 'Camera Configuration', icon: Camera, tone: 'teal', group: 'detection' },
  { id: 'traffic', labelKey: 'systemSettings.catTraffic', fallback: 'Traffic Configuration', icon: TrafficCone, tone: 'amber', group: 'detection' },
  { id: 'vehicle', labelKey: 'systemSettings.catVehicle', fallback: 'Vehicle Configuration', icon: Car, tone: 'emerald', group: 'detection' },
  { id: 'email', labelKey: 'systemSettings.catEmail', fallback: 'Email', icon: Mail, tone: 'blue', group: 'comms' },
  { id: 'sms', labelKey: 'systemSettings.catSms', fallback: 'SMS', icon: MessageSquare, tone: 'cyan', group: 'comms' },
  { id: 'notifications', labelKey: 'systemSettings.catNotifications', fallback: 'Notifications', icon: Bell, tone: 'rose', group: 'comms' },
  { id: 'security', labelKey: 'systemSettings.catSecurity', fallback: 'Security', icon: Shield, tone: 'emerald', group: 'governance' },
  { id: 'language', labelKey: 'systemSettings.catLanguage', fallback: 'Language & Appearance', icon: Languages, tone: 'indigo', group: 'governance' },
  { id: 'backup', labelKey: 'systemSettings.catBackup', fallback: 'Backup & Restore', icon: HardDrive, tone: 'amber', group: 'governance' },
  { id: 'audit', labelKey: 'systemSettings.catAudit', fallback: 'Audit Log', icon: History, tone: 'slate', group: 'governance' },
  { id: 'api', labelKey: 'systemSettings.catApi', fallback: 'API & Integration', icon: Plug, tone: 'teal', group: 'system' },
  { id: 'system', labelKey: 'systemSettings.catSystem', fallback: 'System Information', icon: Info, tone: 'blue', group: 'system' },
];

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.id));

type GeneralConfig = {
  system_name: string;
  organization: string;
  timezone: string;
  date_format: string;
  currency: string;
  language: string;
};

type AiConfig = {
  default_model: string;
  confidence_threshold: string;
  ocr_engine: string;
  detection_mode: 'realtime' | 'batch';
  gpu: string;
  auto_retrain: boolean;
  vehicle_enabled: boolean;
  plate_ocr_enabled: boolean;
  auto_violation: boolean;
};

type CameraConfig = {
  camera_name: string;
  location: string;
  ip_address: string;
  resolution: string;
  default_fps: string;
  reconnect_interval_sec: string;
  recording_enabled: boolean;
  ai_detection_enabled: boolean;
  live_preview_enabled: boolean;
};

type TrafficConfig = {
  enforcement_zone_default: string;
  speed_unit: string;
  auto_flag_violations: boolean;
  grace_period_seconds: string;
};

type VehicleConfig = {
  plate_format: string;
  require_owner_link: boolean;
  unknown_vehicle_alert: boolean;
  retention_days: string;
};

type EmailConfig = {
  smtp_server: string;
  smtp_port: string;
  email: string;
  password: string;
  encryption: string;
  provider: string;
  from_email: string;
};

type SmsConfig = {
  provider: string;
  api_key: string;
  sender_name: string;
  enabled: boolean;
};

type NotificationConfig = {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  system_enabled: boolean;
  violation_alert: boolean;
  payment_reminder: boolean;
};

type SecurityConfig = {
  min_password_length: string;
  require_uppercase: boolean;
  require_number: boolean;
  require_symbol: boolean;
  session_timeout_minutes: string;
  two_factor_enabled: boolean;
  jwt_access_minutes: string;
  login_rate_limit: string;
  require_email_verification: boolean;
  session_rotation: boolean;
};

type ApiConfig = {
  rest_api_enabled: boolean;
  google_maps_status: string;
  cloud_storage: string;
  email_service: string;
  sms_provider: string;
};

type SystemStatus = {
  system: 'online' | 'degraded' | 'offline';
  ai: 'running' | 'idle' | 'offline';
  database: 'healthy' | 'degraded' | 'offline';
  storage_pct: number;
};

const DEFAULT_GENERAL: GeneralConfig = {
  system_name: 'AI Traffic Sign Detection System',
  organization: 'Ministry of Public Works & Transport',
  timezone: 'Asia/Phnom_Penh',
  date_format: 'DD/MM/YYYY',
  currency: 'USD',
  language: 'en',
};

const DEFAULT_AI: AiConfig = {
  default_model: 'YOLOv11 Cambodia',
  confidence_threshold: '0.85',
  ocr_engine: 'PaddleOCR',
  detection_mode: 'realtime',
  gpu: 'RTX 4090',
  auto_retrain: true,
  vehicle_enabled: true,
  plate_ocr_enabled: true,
  auto_violation: true,
};

const DEFAULT_CAMERA: CameraConfig = {
  camera_name: 'Camera 01',
  location: 'National Road 6',
  ip_address: '192.168.1.100',
  resolution: '1920 x 1080',
  default_fps: '30',
  reconnect_interval_sec: '30',
  recording_enabled: true,
  ai_detection_enabled: true,
  live_preview_enabled: true,
};

const DEFAULT_TRAFFIC: TrafficConfig = {
  enforcement_zone_default: 'National roads',
  speed_unit: 'km/h',
  auto_flag_violations: true,
  grace_period_seconds: '3',
};

const DEFAULT_VEHICLE: VehicleConfig = {
  plate_format: 'Cambodia (2+4)',
  require_owner_link: true,
  unknown_vehicle_alert: true,
  retention_days: '365',
};

const DEFAULT_EMAIL: EmailConfig = {
  smtp_server: 'smtp.gmail.com',
  smtp_port: '587',
  email: 'admin@system.com',
  password: '',
  encryption: 'TLS',
  provider: 'smtp',
  from_email: 'admin@system.com',
};

const DEFAULT_SMS: SmsConfig = {
  provider: 'Twilio',
  api_key: '',
  sender_name: 'Traffic Police',
  enabled: true,
};

const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  email_enabled: true,
  sms_enabled: true,
  push_enabled: true,
  system_enabled: true,
  violation_alert: true,
  payment_reminder: true,
};

const DEFAULT_SECURITY: SecurityConfig = {
  min_password_length: '12',
  require_uppercase: true,
  require_number: true,
  require_symbol: true,
  session_timeout_minutes: '30',
  two_factor_enabled: true,
  jwt_access_minutes: '60',
  login_rate_limit: '10',
  require_email_verification: true,
  session_rotation: true,
};

const DEFAULT_API: ApiConfig = {
  rest_api_enabled: true,
  google_maps_status: 'Connected',
  cloud_storage: 'AWS S3',
  email_service: 'SMTP',
  sms_provider: 'Twilio',
};

function ConfigPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="settings-shell__panel-body">
      <div className="settings-shell__panel-intro">
        <h3 className="settings-shell__panel-title">{title}</h3>
        {description ? <p className="settings-shell__panel-desc">{description}</p> : null}
      </div>
      <div className="settings-shell__panel-content">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="settings-shell__fields">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="settings-shell__field">
      <Label className="settings-shell__field-label">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="settings-shell__toggle">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function SaveBar({
  saving,
  onSave,
  saveLabel,
  children,
}: {
  saving: boolean;
  onSave: () => void;
  saveLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="settings-shell__actions">
      <Button type="button" disabled={saving} onClick={onSave}>
        <Save size={14} className="mr-1.5" />
        {saveLabel}
      </Button>
      {children}
    </div>
  );
}

function formatAuditTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function AdminSystemSettingsPage() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('cat') ?? 'overview';
  const category = (VALID_CATEGORIES.has(categoryParam) ? categoryParam : 'overview') as SettingsCategory;

  const setCategory = (id: SettingsCategory) => {
    setSearchParams(id === 'overview' ? {} : { cat: id }, { replace: true });
  };

  const [general, setGeneral] = useState<GeneralConfig>(DEFAULT_GENERAL);
  const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_AI);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig>(DEFAULT_CAMERA);
  const [trafficConfig, setTrafficConfig] = useState<TrafficConfig>(DEFAULT_TRAFFIC);
  const [vehicleConfig, setVehicleConfig] = useState<VehicleConfig>(DEFAULT_VEHICLE);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(DEFAULT_EMAIL);
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(DEFAULT_SMS);
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATIONS);
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(DEFAULT_SECURITY);
  const [apiConfig, setApiConfig] = useState<ApiConfig>(DEFAULT_API);
  const [saving, setSaving] = useState<string | null>(null);
  const [auditRows, setAuditRows] = useState<AuditLogEntry[]>([]);
  const [status, setStatus] = useState<SystemStatus>({
    system: 'online',
    ai: 'running',
    database: 'healthy',
    storage_pct: 72,
  });
  const [backupMeta, setBackupMeta] = useState({ last: '—', location: 'Cloud Storage', schedule: 'Daily' });
  const [platformStats, setPlatformStats] = useState({ detections: 0, accuracy: 0, users: 0 });

  const load = useCallback(async () => {
    const keys = [
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
    ] as const;

    const results = await Promise.allSettled(keys.map((k) => settingsAPI.get(k)));
    const apply = <T,>(idx: number, setter: (v: T) => void, defaults: T) => {
      const r = results[idx];
      if (r?.status === 'fulfilled' && r.value.value && typeof r.value.value === 'object') {
        setter({ ...defaults, ...(r.value.value as T) });
      }
    };

    apply(0, setGeneral, DEFAULT_GENERAL);
    apply(1, setAiConfig, DEFAULT_AI);
    apply(2, setCameraConfig, DEFAULT_CAMERA);
    apply(3, setTrafficConfig, DEFAULT_TRAFFIC);
    apply(4, setVehicleConfig, DEFAULT_VEHICLE);
    apply(5, setEmailConfig, DEFAULT_EMAIL);
    apply(6, setSmsConfig, DEFAULT_SMS);
    apply(7, setNotifConfig, DEFAULT_NOTIFICATIONS);
    apply(8, setSecurityConfig, DEFAULT_SECURITY);
    apply(9, setApiConfig, DEFAULT_API);

    const [statsRes, auditRes, backupsRes] = await Promise.allSettled([
      dashboardAPI.getAdminStats(),
      auditAPI.getAll(),
      dashboardAPI.listSystemBackups(),
    ]);

    if (statsRes.status === 'fulfilled') {
      setStatus({
        system: 'online',
        ai: (statsRes.value.total_detections ?? 0) >= 0 ? 'running' : 'idle',
        database: 'healthy',
        storage_pct: 72,
      });
      setPlatformStats({
        detections: statsRes.value.total_detections ?? 0,
        accuracy: statsRes.value.detection_accuracy ?? 0,
        users: statsRes.value.total_users ?? 0,
      });
    } else {
      setStatus((s) => ({ ...s, system: 'degraded', database: 'degraded' }));
    }

    if (auditRes.status === 'fulfilled') {
      setAuditRows((auditRes.value || []).slice(0, 8));
    }

    if (backupsRes.status === 'fulfilled') {
      const list = (backupsRes.value.backups || []) as Array<{ created_at?: string }>;
      if (list.length) {
        const latest = list.reduce((a, b) =>
          new Date(a.created_at || 0) > new Date(b.created_at || 0) ? a : b,
        );
        if (latest.created_at) {
          const d = new Date(latest.created_at);
          setBackupMeta((m) => ({
            ...m,
            last: Number.isNaN(d.getTime())
              ? latest.created_at!
              : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
          }));
        }
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfig = async (key: string, value: unknown, label: string) => {
    setSaving(key);
    try {
      await settingsAPI.save(key, value, label).catch(() => settingsAPI.update(key, value));
      toast.success(tr('systemSettings.saved', 'Settings saved'));
    } catch {
      toast.error(tr('systemSettings.saveFailed', 'Failed to save settings'));
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    setSaving('all');
    try {
      const payloads: Array<[string, unknown, string]> = [
        ['general_config', general, 'General system settings'],
        ['ai_config', aiConfig, 'AI runtime configuration'],
        ['camera_config', cameraConfig, 'Camera defaults'],
        ['traffic_config', trafficConfig, 'Traffic configuration'],
        ['vehicle_config', vehicleConfig, 'Vehicle configuration'],
        ['email_config', emailConfig, 'Email configuration'],
        ['sms_config', smsConfig, 'SMS configuration'],
        ['notification_config', notifConfig, 'Notification settings'],
        ['security_config', securityConfig, 'Security policy'],
        ['api_config', apiConfig, 'API & integration'],
      ];
      await Promise.all(
        payloads.map(([key, value, label]) =>
          settingsAPI.save(key, value, label).catch(() => settingsAPI.update(key, value)),
        ),
      );
      toast.success(tr('systemSettings.savedAll', 'All settings saved'));
    } catch {
      toast.error(tr('systemSettings.saveFailed', 'Failed to save settings'));
    } finally {
      setSaving(null);
    }
  };

  const activeCategory = useMemo(
    () => CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0],
    [category],
  );
  const ActiveIcon = activeCategory.icon;

  const groupedCategories = useMemo(
    () =>
      CATEGORY_GROUPS.map((group) => ({
        ...group,
        items: CATEGORIES.filter((c) => c.group === group.id),
      })).filter((g) => g.items.length > 0),
    [],
  );

  const statusCards = [
    {
      id: 'system',
      label: tr('systemSettings.statusSystem', 'System'),
      value:
        status.system === 'online'
          ? tr('systemSettings.statusOnline', 'Online')
          : tr('systemSettings.statusDegraded', 'Degraded'),
      tone: status.system === 'online' ? 'success' : 'amber',
      icon: Server,
    },
    {
      id: 'ai',
      label: tr('systemSettings.statusAi', 'AI Service'),
      value:
        status.ai === 'running'
          ? tr('systemSettings.statusRunning', 'Running')
          : tr('systemSettings.statusIdle', 'Idle'),
      tone: status.ai === 'running' ? 'success' : 'amber',
      icon: Cpu,
    },
    {
      id: 'database',
      label: tr('systemSettings.statusDatabase', 'Database'),
      value:
        status.database === 'healthy'
          ? tr('systemSettings.statusHealthy', 'Healthy')
          : tr('systemSettings.statusDegraded', 'Degraded'),
      tone: status.database === 'healthy' ? 'success' : 'amber',
      icon: Database,
    },
    {
      id: 'storage',
      label: tr('systemSettings.statusStorage', 'Storage'),
      value: tr('systemSettings.statusStorageUsed', '{pct}% Used').replace(
        '{pct}',
        String(status.storage_pct),
      ),
      tone: status.storage_pct > 85 ? 'amber' : 'info',
      icon: Cloud,
    },
  ] as const;

  const allSystemsHealthy =
    status.system === 'online' && status.ai === 'running' && status.database === 'healthy';

  const renderPanel = () => {
    switch (category) {
      case 'overview':
        return (
          <div className="settings-shell__panel-body settings-overview">
            <div
              className={cn(
                'settings-overview__health',
                allSystemsHealthy
                  ? 'settings-overview__health--ok'
                  : 'settings-overview__health--warn',
              )}
            >
              <span className="settings-overview__health-icon" aria-hidden>
                {allSystemsHealthy ? <CheckCircle2 size={20} /> : <Activity size={20} />}
              </span>
              <div className="settings-overview__health-copy">
                <p className="settings-overview__health-title">
                  {allSystemsHealthy
                    ? tr('systemSettings.healthAllOk', 'All core services are operational')
                    : tr('systemSettings.healthAttention', 'Some services need attention')}
                </p>
                <p className="settings-overview__health-desc">
                  {tr(
                    'systemSettings.overviewHint',
                    'Monitor platform health and jump to a configuration category',
                  )}
                </p>
              </div>
              <div className="settings-overview__health-stats">
                <div className="settings-overview__health-stat">
                  <span className="settings-overview__health-stat-value">
                    {platformStats.detections.toLocaleString()}
                  </span>
                  <span className="settings-overview__health-stat-label">
                    {tr('systemSettings.statDetections', 'Detections')}
                  </span>
                </div>
                <div className="settings-overview__health-stat">
                  <span className="settings-overview__health-stat-value">
                    {platformStats.accuracy > 0 ? `${platformStats.accuracy}%` : '—'}
                  </span>
                  <span className="settings-overview__health-stat-label">
                    {tr('systemSettings.statAccuracy', 'AI accuracy')}
                  </span>
                </div>
                <div className="settings-overview__health-stat">
                  <span className="settings-overview__health-stat-value">
                    {platformStats.users.toLocaleString()}
                  </span>
                  <span className="settings-overview__health-stat-label">
                    {tr('systemSettings.statUsers', 'Portal users')}
                  </span>
                </div>
              </div>
            </div>

            <section className="settings-overview__section">
              <h3 className="settings-shell__section-label">
                {tr('systemSettings.systemStatus', 'System Status')}
              </h3>
              <div className="settings-shell__status-grid">
                {statusCards.map(({ id, label, value, tone, icon: Icon }) => (
                  <div
                    key={id}
                    className={cn('settings-shell__status-card', `settings-shell__status-card--${tone}`)}
                  >
                    <span className={cn('settings-shell__status-icon', `settings-shell__status-icon--${tone}`)}>
                      <Icon size={16} />
                    </span>
                    <div className="settings-overview__status-body">
                      <p className="settings-shell__status-label">{label}</p>
                      <p className="settings-shell__status-value">
                        <span className={cn('settings-shell__dot', `settings-shell__dot--${tone}`)} />
                        {value}
                      </p>
                      {id === 'storage' ? (
                        <div className="settings-overview__storage-bar" aria-hidden>
                          <span
                            className={cn(
                              'settings-overview__storage-fill',
                              status.storage_pct > 85 && 'settings-overview__storage-fill--warn',
                            )}
                            style={{ width: `${status.storage_pct}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="settings-overview__section">
              <h3 className="settings-shell__section-label">
                {tr('systemSettings.platformSnapshot', 'Platform snapshot')}
              </h3>
              <div className="settings-overview__snapshot-grid">
                <div className="settings-overview__snapshot-card">
                  <Building2 size={15} />
                  <div>
                    <p className="settings-overview__snapshot-label">
                      {tr('systemSettings.systemName', 'System Name')}
                    </p>
                    <p className="settings-overview__snapshot-value">{general.system_name}</p>
                  </div>
                </div>
                <div className="settings-overview__snapshot-card">
                  <Cpu size={15} />
                  <div>
                    <p className="settings-overview__snapshot-label">
                      {tr('systemSettings.defaultModel', 'Default AI Model')}
                    </p>
                    <p className="settings-overview__snapshot-value">{aiConfig.default_model}</p>
                  </div>
                </div>
                <div className="settings-overview__snapshot-card">
                  <HardDrive size={15} />
                  <div>
                    <p className="settings-overview__snapshot-label">
                      {tr('systemSettings.lastBackup', 'Last Backup')}
                    </p>
                    <p className="settings-overview__snapshot-value">{backupMeta.last}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-overview__section">
              <h3 className="settings-shell__section-label">
                {tr('systemSettings.quickSettings', 'Quick Settings')}
              </h3>
              <div className="settings-overview__quick-groups">
                {groupedCategories.map((group) => {
                  const items = group.items.filter((item) => item.id !== 'overview');
                  if (!items.length) return null;
                  return (
                    <div key={group.id} className="settings-overview__quick-group">
                      <p className="settings-overview__quick-group-label">
                        {tr(group.labelKey, group.fallback)}
                      </p>
                      <div className="settings-shell__quick-grid">
                        {items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={cn(
                                'settings-shell__quick-item',
                                `settings-shell__quick-item--${item.tone}`,
                              )}
                              onClick={() => setCategory(item.id)}
                            >
                              <span
                                className={cn(
                                  'settings-shell__quick-icon',
                                  `settings-shell__quick-icon--${item.tone}`,
                                )}
                              >
                                <Icon size={15} />
                              </span>
                              <span className="settings-overview__quick-label">
                                {tr(item.labelKey, item.fallback)}
                              </span>
                              <ArrowRight size={14} className="settings-shell__quick-arrow" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {auditRows.length > 0 ? (
              <section className="settings-overview__section">
                <div className="settings-overview__section-head">
                  <h3 className="settings-shell__section-label settings-overview__section-label">
                    {tr('systemSettings.recentActivity', 'Recent activity')}
                  </h3>
                  <Link to="/admin/audit-logs" className="settings-shell__ghost-link">
                    {tr('systemSettings.viewFullAudit', 'View full audit log')}
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <ul className="settings-overview__activity-list">
                  {auditRows.slice(0, 5).map((row) => (
                    <li key={row.id} className="settings-overview__activity-item">
                      <span className="settings-overview__activity-time">
                        {formatAuditTime(row.timestamp)}
                      </span>
                      <span className="settings-overview__activity-user">{row.user_name || '—'}</span>
                      <span className="settings-overview__activity-action">{row.action}</span>
                      <span className="settings-overview__activity-module">{row.resource}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        );

      case 'general':
        return (
          <ConfigPanel
            title={tr('systemSettings.generalTitle', 'General Settings')}
            description={tr('systemSettings.generalHint', 'Organization identity and regional defaults')}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.systemName', 'System Name')}>
                <Input
                  value={general.system_name}
                  onChange={(e) => setGeneral((c) => ({ ...c, system_name: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.organization', 'Organization')}>
                <Input
                  value={general.organization}
                  onChange={(e) => setGeneral((c) => ({ ...c, organization: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.timezone', 'Timezone')}>
                <Select
                  value={general.timezone}
                  onValueChange={(v) => setGeneral((c) => ({ ...c, timezone: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Phnom_Penh">Asia/Phnom_Penh</SelectItem>
                    <SelectItem value="Asia/Bangkok">Asia/Bangkok</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.dateFormat', 'Date Format')}>
                <Select
                  value={general.date_format}
                  onValueChange={(v) => setGeneral((c) => ({ ...c, date_format: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.currency', 'Currency')}>
                <Select
                  value={general.currency}
                  onValueChange={(v) => setGeneral((c) => ({ ...c, currency: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="KHR">KHR</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.defaultLanguage', 'Language')}>
                <Select
                  value={general.language}
                  onValueChange={(v) => setGeneral((c) => ({ ...c, language: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="km">Khmer</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGrid>
            <div className="settings-shell__logo-box">
              <Upload size={18} />
              <div>
                <p className="font-medium text-sm">{tr('systemSettings.logo', 'Logo')}</p>
                <p className="text-xs text-muted-foreground">
                  {tr('systemSettings.logoHint', 'Upload organization logo (PNG or SVG)')}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled>
                {tr('systemSettings.uploadLogo', 'Upload Logo')}
              </Button>
            </div>
            <SaveBar
              saving={saving === 'general_config'}
              onSave={() => void saveConfig('general_config', general, 'General system settings')}
              saveLabel={tr('common.save', 'Save')}
            />
          </ConfigPanel>
        );

      case 'users':
        return (
          <ConfigPanel
            title={tr('systemSettings.usersTitle', 'User Settings')}
            description={tr(
              'systemSettings.usersHint',
              'Manage administrators, officers, drivers, and role permissions',
            )}
          >
            <div className="settings-shell__link-cards">
              <Link to="/admin/users" className="settings-shell__link-card">
                <UserCog size={18} />
                <div>
                  <p className="font-semibold text-sm">{tr('sidebar.modules.users', 'Users')}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr('systemSettings.usersManage', 'Create and manage portal accounts')}
                  </p>
                </div>
                <ArrowRight size={14} />
              </Link>
              <Link to="/admin/roles" className="settings-shell__link-card">
                <KeyRound size={18} />
                <div>
                  <p className="font-semibold text-sm">{tr('sidebar.modules.roles', 'Roles')}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr('systemSettings.rolesManage', 'RBAC roles and permission matrix')}
                  </p>
                </div>
                <ArrowRight size={14} />
              </Link>
              <Link to="/admin/profile" className="settings-shell__link-card">
                <Shield size={18} />
                <div>
                  <p className="font-semibold text-sm">{tr('sidebar.modules.profile', 'Profile')}</p>
                  <p className="text-xs text-muted-foreground">
                    {tr('systemSettings.profileManage', 'Your administrator profile')}
                  </p>
                </div>
                <ArrowRight size={14} />
              </Link>
            </div>
          </ConfigPanel>
        );

      case 'ai':
        return (
          <ConfigPanel
            title={tr('systemSettings.aiTitle', 'AI Configuration')}
            description={tr(
              'systemSettings.aiHint',
              'Detection model defaults. Model weights are configured in backend environment.',
            )}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.defaultModel', 'Default AI Model')}>
                <Input
                  value={aiConfig.default_model}
                  onChange={(e) => setAiConfig((c) => ({ ...c, default_model: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.confidenceThreshold', 'Confidence Threshold')}>
                <Input
                  value={aiConfig.confidence_threshold}
                  onChange={(e) => setAiConfig((c) => ({ ...c, confidence_threshold: e.target.value }))}
                  placeholder="0.85"
                />
              </Field>
              <Field label={tr('systemSettings.ocrEngine', 'OCR Engine')}>
                <Select
                  value={aiConfig.ocr_engine}
                  onValueChange={(v) => setAiConfig((c) => ({ ...c, ocr_engine: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PaddleOCR">PaddleOCR</SelectItem>
                    <SelectItem value="EasyOCR">EasyOCR</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.gpu', 'GPU')}>
                <Input
                  value={aiConfig.gpu}
                  onChange={(e) => setAiConfig((c) => ({ ...c, gpu: e.target.value }))}
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__radio-group">
              <p className="settings-shell__field-label">
                {tr('systemSettings.detectionMode', 'Detection Mode')}
              </p>
              <label className="settings-shell__radio">
                <input
                  type="radio"
                  name="detection_mode"
                  checked={aiConfig.detection_mode === 'realtime'}
                  onChange={() => setAiConfig((c) => ({ ...c, detection_mode: 'realtime' }))}
                />
                {tr('systemSettings.modeRealtime', 'Real-time')}
              </label>
              <label className="settings-shell__radio">
                <input
                  type="radio"
                  name="detection_mode"
                  checked={aiConfig.detection_mode === 'batch'}
                  onChange={() => setAiConfig((c) => ({ ...c, detection_mode: 'batch' }))}
                />
                {tr('systemSettings.modeBatch', 'Batch')}
              </label>
            </div>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.autoRetrain', 'Auto Retrain')}
                checked={aiConfig.auto_retrain}
                onCheckedChange={(v) => setAiConfig((c) => ({ ...c, auto_retrain: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.vehicle_enabled', 'Vehicle detection enabled')}
                checked={aiConfig.vehicle_enabled}
                onCheckedChange={(v) => setAiConfig((c) => ({ ...c, vehicle_enabled: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.plate_ocr_enabled', 'License plate OCR enabled')}
                checked={aiConfig.plate_ocr_enabled}
                onCheckedChange={(v) => setAiConfig((c) => ({ ...c, plate_ocr_enabled: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.auto_violation', 'Auto-create violations from pipeline')}
                checked={aiConfig.auto_violation}
                onCheckedChange={(v) => setAiConfig((c) => ({ ...c, auto_violation: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'ai_config'}
              onSave={() => void saveConfig('ai_config', aiConfig, 'AI runtime configuration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Link to="/admin/ai-models" className="settings-shell__ghost-link">
                {t('sidebar.nav.aiModels')}
                <ArrowRight size={14} />
              </Link>
            </SaveBar>
          </ConfigPanel>
        );

      case 'camera':
        return (
          <ConfigPanel
            title={tr('systemSettings.cameraTitle', 'Camera Configuration')}
            description={tr('systemSettings.cameraHint', 'Default stream settings for camera endpoints')}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.cameraName', 'Camera Name')}>
                <Input
                  value={cameraConfig.camera_name}
                  onChange={(e) => setCameraConfig((c) => ({ ...c, camera_name: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.cameraLocation', 'Location')}>
                <Input
                  value={cameraConfig.location}
                  onChange={(e) => setCameraConfig((c) => ({ ...c, location: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.ipAddress', 'IP Address')}>
                <Input
                  value={cameraConfig.ip_address}
                  onChange={(e) => setCameraConfig((c) => ({ ...c, ip_address: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.resolution', 'Resolution')}>
                <Input
                  value={cameraConfig.resolution}
                  onChange={(e) => setCameraConfig((c) => ({ ...c, resolution: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.defaultFps', 'FPS')}>
                <Input
                  value={cameraConfig.default_fps}
                  onChange={(e) => setCameraConfig((c) => ({ ...c, default_fps: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.reconnectInterval', 'Reconnect interval (seconds)')}>
                <Input
                  value={cameraConfig.reconnect_interval_sec}
                  onChange={(e) =>
                    setCameraConfig((c) => ({ ...c, reconnect_interval_sec: e.target.value }))
                  }
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.recording', 'Recording')}
                checked={cameraConfig.recording_enabled}
                onCheckedChange={(v) => setCameraConfig((c) => ({ ...c, recording_enabled: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.aiDetection', 'AI Detection')}
                checked={cameraConfig.ai_detection_enabled}
                onCheckedChange={(v) => setCameraConfig((c) => ({ ...c, ai_detection_enabled: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.livePreview', 'Enable live preview by default')}
                checked={cameraConfig.live_preview_enabled}
                onCheckedChange={(v) => setCameraConfig((c) => ({ ...c, live_preview_enabled: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'camera_config'}
              onSave={() => void saveConfig('camera_config', cameraConfig, 'Camera defaults')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Link to="/admin/cameras" className="settings-shell__ghost-link">
                {t('sidebar.nav.cameras')}
                <ArrowRight size={14} />
              </Link>
            </SaveBar>
          </ConfigPanel>
        );

      case 'traffic':
        return (
          <ConfigPanel
            title={tr('systemSettings.trafficTitle', 'Traffic Configuration')}
            description={tr('systemSettings.trafficHint', 'Enforcement defaults for traffic law modules')}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.enforcementZone', 'Default enforcement zone')}>
                <Input
                  value={trafficConfig.enforcement_zone_default}
                  onChange={(e) =>
                    setTrafficConfig((c) => ({ ...c, enforcement_zone_default: e.target.value }))
                  }
                />
              </Field>
              <Field label={tr('systemSettings.speedUnit', 'Speed unit')}>
                <Select
                  value={trafficConfig.speed_unit}
                  onValueChange={(v) => setTrafficConfig((c) => ({ ...c, speed_unit: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="km/h">km/h</SelectItem>
                    <SelectItem value="mph">mph</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.gracePeriod', 'Grace period (seconds)')}>
                <Input
                  value={trafficConfig.grace_period_seconds}
                  onChange={(e) =>
                    setTrafficConfig((c) => ({ ...c, grace_period_seconds: e.target.value }))
                  }
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.autoFlag', 'Auto-flag violations')}
                checked={trafficConfig.auto_flag_violations}
                onCheckedChange={(v) => setTrafficConfig((c) => ({ ...c, auto_flag_violations: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'traffic_config'}
              onSave={() => void saveConfig('traffic_config', trafficConfig, 'Traffic configuration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Link to="/admin/signs" className="settings-shell__ghost-link">
                {t('sidebar.nav.trafficSigns')}
                <ArrowRight size={14} />
              </Link>
            </SaveBar>
          </ConfigPanel>
        );

      case 'vehicle':
        return (
          <ConfigPanel
            title={tr('systemSettings.vehicleTitle', 'Vehicle Configuration')}
            description={tr('systemSettings.vehicleHint', 'Plate format and registry behaviour')}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.plateFormat', 'Plate format')}>
                <Input
                  value={vehicleConfig.plate_format}
                  onChange={(e) => setVehicleConfig((c) => ({ ...c, plate_format: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.retentionDays', 'Evidence retention (days)')}>
                <Input
                  value={vehicleConfig.retention_days}
                  onChange={(e) => setVehicleConfig((c) => ({ ...c, retention_days: e.target.value }))}
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.requireOwner', 'Require owner link')}
                checked={vehicleConfig.require_owner_link}
                onCheckedChange={(v) => setVehicleConfig((c) => ({ ...c, require_owner_link: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.unknownAlert', 'Alert on unknown vehicles')}
                checked={vehicleConfig.unknown_vehicle_alert}
                onCheckedChange={(v) => setVehicleConfig((c) => ({ ...c, unknown_vehicle_alert: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'vehicle_config'}
              onSave={() => void saveConfig('vehicle_config', vehicleConfig, 'Vehicle configuration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Link to="/admin/vehicles" className="settings-shell__ghost-link">
                {t('sidebar.nav.allVehicles')}
                <ArrowRight size={14} />
              </Link>
            </SaveBar>
          </ConfigPanel>
        );

      case 'email':
        return (
          <ConfigPanel
            title={tr('systemSettings.emailTitle', 'Email Configuration')}
            description={tr(
              'systemSettings.emailHint',
              'SMTP delivery settings. Sensitive API keys should also remain in backend .env.',
            )}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.smtpServer', 'SMTP Server')}>
                <Input
                  value={emailConfig.smtp_server}
                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtp_server: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.smtpPort', 'SMTP Port')}>
                <Input
                  value={emailConfig.smtp_port}
                  onChange={(e) => setEmailConfig((c) => ({ ...c, smtp_port: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.emailAddress', 'Email')}>
                <Input
                  value={emailConfig.email}
                  onChange={(e) => setEmailConfig((c) => ({ ...c, email: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.emailPassword', 'Password')}>
                <Input
                  type="password"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig((c) => ({ ...c, password: e.target.value }))}
                  placeholder="********"
                />
              </Field>
              <Field label={tr('systemSettings.encryption', 'Encryption')}>
                <Select
                  value={emailConfig.encryption}
                  onValueChange={(v) => setEmailConfig((c) => ({ ...c, encryption: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TLS">TLS</SelectItem>
                    <SelectItem value="SSL">SSL</SelectItem>
                    <SelectItem value="None">None</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label={tr('systemSettings.fromEmail', 'From email')}>
                <Input
                  value={emailConfig.from_email}
                  onChange={(e) => setEmailConfig((c) => ({ ...c, from_email: e.target.value }))}
                />
              </Field>
            </FieldGrid>
            <SaveBar
              saving={saving === 'email_config'}
              onSave={() => void saveConfig('email_config', emailConfig, 'Email configuration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.message(tr('systemSettings.testEmailQueued', 'Test connection queued'))}
              >
                {tr('systemSettings.testConnection', 'Test Connection')}
              </Button>
            </SaveBar>
          </ConfigPanel>
        );

      case 'sms':
        return (
          <ConfigPanel
            title={tr('systemSettings.smsTitle', 'SMS Configuration')}
            description={tr('systemSettings.smsHint', 'Outbound SMS provider for alerts and reminders')}
          >
            <FieldGrid>
              <Field label={tr('systemSettings.smsProvider', 'Provider')}>
                <Input
                  value={smsConfig.provider}
                  onChange={(e) => setSmsConfig((c) => ({ ...c, provider: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.smsApiKey', 'API Key')}>
                <Input
                  type="password"
                  value={smsConfig.api_key}
                  onChange={(e) => setSmsConfig((c) => ({ ...c, api_key: e.target.value }))}
                  placeholder="****************"
                />
              </Field>
              <Field label={tr('systemSettings.smsSender', 'Sender Name')}>
                <Input
                  value={smsConfig.sender_name}
                  onChange={(e) => setSmsConfig((c) => ({ ...c, sender_name: e.target.value }))}
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.smsEnabled', 'Enable SMS notifications')}
                checked={smsConfig.enabled}
                onCheckedChange={(v) => setSmsConfig((c) => ({ ...c, enabled: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'sms_config'}
              onSave={() => void saveConfig('sms_config', smsConfig, 'SMS configuration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.message(tr('systemSettings.testSmsQueued', 'Test SMS queued'))}
              >
                {tr('systemSettings.testSms', 'Test SMS')}
              </Button>
            </SaveBar>
          </ConfigPanel>
        );

      case 'notifications':
        return (
          <ConfigPanel
            title={tr('systemSettings.notifTitle', 'Notification Settings')}
            description={tr('systemSettings.notifHint', 'Channels and alert types for the enforcement platform')}
          >
            <div className="settings-shell__toggles">
              {(
                [
                  ['email_enabled', 'Email Notification'],
                  ['sms_enabled', 'SMS Notification'],
                  ['push_enabled', 'Push Notification'],
                  ['system_enabled', 'System Notification'],
                  ['violation_alert', 'Violation Alert'],
                  ['payment_reminder', 'Payment Reminder'],
                ] as const
              ).map(([key, fb]) => (
                <ToggleRow
                  key={key}
                  label={tr(`systemSettings.notif.${key}`, fb)}
                  checked={notifConfig[key]}
                  onCheckedChange={(v) => setNotifConfig((c) => ({ ...c, [key]: v }))}
                />
              ))}
            </div>
            <SaveBar
              saving={saving === 'notification_config'}
              onSave={() => void saveConfig('notification_config', notifConfig, 'Notification settings')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Link to="/admin/notifications" className="settings-shell__ghost-link">
                {t('sidebar.nav.notifications')}
                <ArrowRight size={14} />
              </Link>
            </SaveBar>
          </ConfigPanel>
        );

      case 'security':
        return (
          <ConfigPanel
            title={tr('systemSettings.securityTitle', 'Security Settings')}
            description={tr('systemSettings.securityHint', 'Password policy, sessions, and authentication')}
          >
            <h3 className="settings-shell__section-label">
              {tr('systemSettings.passwordPolicy', 'Password Policy')}
            </h3>
            <FieldGrid>
              <Field label={tr('systemSettings.minLength', 'Minimum Length')}>
                <Input
                  value={securityConfig.min_password_length}
                  onChange={(e) =>
                    setSecurityConfig((c) => ({ ...c, min_password_length: e.target.value }))
                  }
                />
              </Field>
              <Field label={tr('systemSettings.sessionTimeout', 'Session Timeout (minutes)')}>
                <Input
                  value={securityConfig.session_timeout_minutes}
                  onChange={(e) =>
                    setSecurityConfig((c) => ({ ...c, session_timeout_minutes: e.target.value }))
                  }
                />
              </Field>
              <Field label={tr('systemSettings.jwtAccess', 'JWT access token (minutes)')}>
                <Input
                  value={securityConfig.jwt_access_minutes}
                  onChange={(e) =>
                    setSecurityConfig((c) => ({ ...c, jwt_access_minutes: e.target.value }))
                  }
                />
              </Field>
              <Field label={tr('systemSettings.loginRateLimit', 'Login attempts before lockout')}>
                <Input
                  value={securityConfig.login_rate_limit}
                  onChange={(e) =>
                    setSecurityConfig((c) => ({ ...c, login_rate_limit: e.target.value }))
                  }
                />
              </Field>
            </FieldGrid>
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.requireUppercase', 'Require Uppercase')}
                checked={securityConfig.require_uppercase}
                onCheckedChange={(v) => setSecurityConfig((c) => ({ ...c, require_uppercase: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.requireNumber', 'Require Number')}
                checked={securityConfig.require_number}
                onCheckedChange={(v) => setSecurityConfig((c) => ({ ...c, require_number: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.requireSymbol', 'Require Symbol')}
                checked={securityConfig.require_symbol}
                onCheckedChange={(v) => setSecurityConfig((c) => ({ ...c, require_symbol: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.twoFactor', 'Two-Factor Authentication')}
                checked={securityConfig.two_factor_enabled}
                onCheckedChange={(v) => setSecurityConfig((c) => ({ ...c, two_factor_enabled: v }))}
              />
              <ToggleRow
                label={tr('systemSettings.requireEmailVerify', 'Require email verification')}
                checked={securityConfig.require_email_verification}
                onCheckedChange={(v) =>
                  setSecurityConfig((c) => ({ ...c, require_email_verification: v }))
                }
              />
              <ToggleRow
                label={tr('systemSettings.sessionRotation', 'Rotate refresh tokens on login')}
                checked={securityConfig.session_rotation}
                onCheckedChange={(v) => setSecurityConfig((c) => ({ ...c, session_rotation: v }))}
              />
            </div>
            <SaveBar
              saving={saving === 'security_config'}
              onSave={() => void saveConfig('security_config', securityConfig, 'Security policy')}
              saveLabel={tr('common.save', 'Save')}
            />
          </ConfigPanel>
        );

      case 'language':
        return (
          <ConfigPanel
            title={tr('systemSettings.languageTitle', 'Language & Appearance')}
            description={tr(
              'systemSettings.languageHint',
              'Customize navigation labels, page shell colors, and portal color mode',
            )}
          >
            <LanguageThemeManagementPanel embedded />
          </ConfigPanel>
        );

      case 'backup':
        return (
          <ConfigPanel
            title={tr('systemSettings.backupTitle', 'Backup & Restore')}
            description={tr('systemSettings.backupHint', 'Schedule, export, and restore system data')}
          >
            <div className="settings-page__grid">
              <div className="settings-page__card settings-page__card--info">
                <span className="settings-page__card-icon settings-page__card-icon--info">
                  <HardDrive size={16} />
                </span>
                <div>
                  <p className="settings-page__card-label">{tr('systemSettings.lastBackup', 'Last Backup')}</p>
                  <p className="settings-page__card-value">{backupMeta.last}</p>
                </div>
              </div>
              <div className="settings-page__card settings-page__card--violet">
                <span className="settings-page__card-icon settings-page__card-icon--violet">
                  <Cloud size={16} />
                </span>
                <div>
                  <p className="settings-page__card-label">{tr('systemSettings.backupLocation', 'Backup Location')}</p>
                  <p className="settings-page__card-value">{backupMeta.location}</p>
                </div>
              </div>
              <div className="settings-page__card settings-page__card--amber">
                <span className="settings-page__card-icon settings-page__card-icon--amber">
                  <Activity size={16} />
                </span>
                <div>
                  <p className="settings-page__card-label">{tr('systemSettings.backupSchedule', 'Backup Schedule')}</p>
                  <p className="settings-page__card-value">{backupMeta.schedule}</p>
                </div>
              </div>
            </div>
            <div className="settings-shell__actions">
              <Link to="/admin/backup-restore" className="enforcement-page__hero-btn enforcement-page__hero-btn--violet text-sm py-2">
                {tr('systemSettings.openBackupCenter', 'Open Backup Center')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </ConfigPanel>
        );

      case 'audit':
        return (
          <ConfigPanel
            title={tr('systemSettings.auditTitle', 'Audit Log')}
            description={tr('systemSettings.auditHint', 'Recent configuration and security events')}
          >
            <div className="settings-shell__table-wrap">
              <table className="settings-shell__table">
                <thead>
                  <tr>
                    <th>{tr('systemSettings.auditTime', 'Time')}</th>
                    <th>{tr('systemSettings.auditUser', 'User')}</th>
                    <th>{tr('systemSettings.auditAction', 'Action')}</th>
                    <th>{tr('systemSettings.auditModule', 'Module')}</th>
                    <th>{tr('systemSettings.auditIp', 'IP')}</th>
                    <th>{tr('systemSettings.auditStatus', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="settings-shell__empty">
                        {tr('systemSettings.auditEmpty', 'No audit events yet')}
                      </td>
                    </tr>
                  ) : (
                    auditRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatAuditTime(row.timestamp)}</td>
                        <td>{row.user_name || '—'}</td>
                        <td>{row.action}</td>
                        <td>{row.resource}</td>
                        <td>{row.ip_address || '—'}</td>
                        <td>
                          <span className="settings-shell__badge settings-shell__badge--success">
                            {tr('systemSettings.auditSuccess', 'Success')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="settings-shell__actions">
              <Link to="/admin/audit-logs" className="settings-shell__ghost-link">
                {tr('systemSettings.viewFullAudit', 'View full audit log')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </ConfigPanel>
        );

      case 'api':
        return (
          <ConfigPanel
            title={tr('systemSettings.apiTitle', 'API & Integration')}
            description={tr('systemSettings.apiHint', 'External services connected to CamTraffic')}
          >
            <div className="settings-shell__toggles">
              <ToggleRow
                label={tr('systemSettings.restApi', 'REST API')}
                checked={apiConfig.rest_api_enabled}
                onCheckedChange={(v) => setApiConfig((c) => ({ ...c, rest_api_enabled: v }))}
              />
            </div>
            <FieldGrid>
              <Field label={tr('systemSettings.googleMaps', 'Google Maps API')}>
                <Input
                  value={apiConfig.google_maps_status}
                  onChange={(e) => setApiConfig((c) => ({ ...c, google_maps_status: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.cloudStorage', 'Cloud Storage')}>
                <Input
                  value={apiConfig.cloud_storage}
                  onChange={(e) => setApiConfig((c) => ({ ...c, cloud_storage: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.emailService', 'Email Service')}>
                <Input
                  value={apiConfig.email_service}
                  onChange={(e) => setApiConfig((c) => ({ ...c, email_service: e.target.value }))}
                />
              </Field>
              <Field label={tr('systemSettings.smsProviderLabel', 'SMS Provider')}>
                <Input
                  value={apiConfig.sms_provider}
                  onChange={(e) => setApiConfig((c) => ({ ...c, sms_provider: e.target.value }))}
                />
              </Field>
            </FieldGrid>
            <SaveBar
              saving={saving === 'api_config'}
              onSave={() => void saveConfig('api_config', apiConfig, 'API & integration')}
              saveLabel={tr('common.save', 'Save')}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => toast.message(tr('systemSettings.testConnection', 'Test Connection'))}
              >
                {tr('systemSettings.testConnection', 'Test Connection')}
              </Button>
            </SaveBar>
          </ConfigPanel>
        );

      case 'system': {
        const serverHealthy = status.database === 'healthy';
        const systemInfoSections = [
          {
            title: tr('systemSettings.systemInfoStack', 'Technology Stack'),
            items: [
              {
                label: tr('systemSettings.systemInfoVersion', 'Application Version'),
                value: 'v1.0.0',
                icon: Server,
                tone: 'info',
              },
              {
                label: tr('systemSettings.systemInfoBackend', 'Backend'),
                value: 'Django + DRF',
                icon: Database,
                tone: 'indigo',
              },
              {
                label: tr('systemSettings.systemInfoFrontend', 'Frontend'),
                value: 'React + Vite',
                icon: Monitor,
                tone: 'cyan',
              },
              {
                label: tr('systemSettings.systemInfoDatabase', 'Database'),
                value: 'PostgreSQL / MySQL',
                icon: Cloud,
                tone: 'emerald',
              },
            ],
          },
          {
            title: tr('systemSettings.systemInfoRuntime', 'AI & Runtime'),
            items: [
              {
                label: tr('systemSettings.systemInfoAiFramework', 'AI Framework'),
                value: 'YOLOv11 + PaddleOCR',
                icon: Cpu,
                tone: 'cyan',
              },
              {
                label: tr('systemSettings.systemInfoPython', 'Python Version'),
                value: '3.12',
                icon: Code2,
                tone: 'amber',
              },
              {
                label: tr('systemSettings.systemInfoGpu', 'GPU'),
                value: aiConfig.gpu || 'RTX 4090',
                icon: Activity,
                tone: 'violet',
              },
              {
                label: tr('systemSettings.systemInfoServerStatus', 'Server Status'),
                value: serverHealthy
                  ? tr('systemSettings.statusHealthy', 'Healthy')
                  : tr('systemSettings.statusDegraded', 'Degraded'),
                icon: Activity,
                tone: serverHealthy ? 'success' : 'amber',
                showDot: true,
              },
            ],
          },
        ] as const;

        return (
          <ConfigPanel
            title={tr('systemSettings.systemInfoTitle', 'System Information')}
            description={tr('systemSettings.systemInfoHint', 'Runtime stack and environment summary')}
          >
            <div className="settings-shell__sysinfo-body">
              <div className="settings-shell__sysinfo-hero">
                <span className="settings-shell__sysinfo-hero-icon">
                  <Info size={20} />
                </span>
                <div className="settings-shell__sysinfo-hero-copy">
                  <p className="settings-shell__sysinfo-hero-title">
                    {general.system_name || 'CamTraffic'}
                  </p>
                  <p className="settings-shell__sysinfo-hero-sub">
                    {tr('systemSettings.systemInfoDeploy', 'Production deployment')} · v1.0.0
                  </p>
                </div>
                <span
                  className={cn(
                    'settings-shell__sysinfo-badge',
                    serverHealthy
                      ? 'settings-shell__sysinfo-badge--success'
                      : 'settings-shell__sysinfo-badge--amber',
                  )}
                >
                  <span
                    className={cn(
                      'settings-shell__dot',
                      serverHealthy ? 'settings-shell__dot--success' : 'settings-shell__dot--amber',
                    )}
                  />
                  {serverHealthy
                    ? tr('systemSettings.statusHealthy', 'Healthy')
                    : tr('systemSettings.statusDegraded', 'Degraded')}
                </span>
              </div>

              {systemInfoSections.map((section) => (
                <div key={section.title} className="settings-shell__sysinfo-section">
                  <h3 className="settings-shell__section-label">{section.title}</h3>
                  <div className="settings-shell__sysinfo-grid">
                    {section.items.map((item) => {
                      const { label, value, icon: Icon, tone } = item;
                      const showDot = 'showDot' in item && item.showDot;
                      return (
                        <div
                          key={label}
                          className={cn('settings-shell__sysinfo-card', `settings-shell__sysinfo-card--${tone}`)}
                        >
                          <span
                            className={cn(
                              'settings-shell__sysinfo-icon',
                              `settings-shell__sysinfo-icon--${tone}`,
                            )}
                          >
                            <Icon size={16} />
                          </span>
                          <div className="settings-shell__sysinfo-card-copy">
                            <p className="settings-shell__sysinfo-label">{label}</p>
                            <p className="settings-shell__sysinfo-value">
                              {showDot ? (
                                <span
                                  className={cn(
                                    'settings-shell__dot',
                                    tone === 'success' ? 'settings-shell__dot--success' : 'settings-shell__dot--amber',
                                  )}
                                />
                              ) : null}
                              {value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ConfigPanel>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="enforcement-page enforcement-page--settings dashboard-page--settings settings-page--enterprise">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon">
                <Settings2 size={14} />
              </span>
              {tr('systemSettings.eyebrow', 'Administration')}
            </div>
            <h1 className="enforcement-page__title">
              {tr('sidebar.pageTitles.settings', 'System Settings')}
            </h1>
            <p className="enforcement-page__subtitle">
              {tr(
                'systemSettings.subtitle',
                'Enterprise control center for AI, cameras, notifications, security, and integrations',
              )}
            </p>
            <div className="settings-shell__hero-chips" aria-hidden>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--blue">
                {CATEGORIES.length - 1} {tr('systemSettings.categories', 'Settings')}
              </span>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--cyan">
                {tr(activeCategory.labelKey, activeCategory.fallback)}
              </span>
              <span className="settings-shell__hero-chip settings-shell__hero-chip--emerald">
                {status.system === 'online'
                  ? tr('systemSettings.statusOnline', 'Online')
                  : tr('systemSettings.statusDegraded', 'Degraded')}
              </span>
            </div>
          </div>
          <div className="settings-shell__hero-actions">
            <Button
              type="button"
              className="settings-shell__hero-save"
              disabled={saving === 'all'}
              onClick={() => void saveAll()}
            >
              <Save size={14} className="mr-1.5" />
              {tr('systemSettings.saveAll', 'Save All')}
            </Button>
            <Link
              to="/admin/backup-restore"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
            >
              <HardDrive size={16} />
              {tr('systemSettings.backup', 'Backup')}
            </Link>
            <Link
              to="/admin/backup-restore"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
            >
              <Database size={16} />
              {tr('systemSettings.restore', 'Restore')}
            </Link>
            <Link
              to="/admin/audit-logs"
              className="enforcement-page__hero-btn enforcement-page__hero-btn--outline"
            >
              <History size={16} />
              {tr('systemSettings.auditLog', 'Audit Log')}
            </Link>
          </div>
        </div>
      </div>

      <div className="settings-shell">
        <aside className="settings-shell__card settings-shell__nav" aria-label={tr('systemSettings.categories', 'Settings categories')}>
          <div className="settings-shell__card-accent" aria-hidden />
          <div className="settings-shell__nav-inner">
            <div className="settings-shell__nav-brand">
              <span className="settings-shell__nav-brand-icon"><Settings2 size={16} /></span>
              <div>
                <p className="settings-shell__nav-heading">{tr('systemSettings.categories', 'Settings')}</p>
                <p className="settings-shell__nav-sub">{tr('systemSettings.navHint', 'Choose a category')}</p>
              </div>
            </div>
            <nav className="settings-shell__nav-list">
              {groupedCategories.map((group) => (
                <div key={group.id} className="settings-shell__nav-group">
                  <p className="settings-shell__nav-group-label">{tr(group.labelKey, group.fallback)}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = category === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          'settings-shell__nav-item',
                          `settings-shell__nav-item--${item.tone}`,
                          active && 'settings-shell__nav-item--active',
                        )}
                        onClick={() => setCategory(item.id)}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className={cn('settings-shell__nav-icon', `settings-shell__nav-icon--${item.tone}`)}>
                          <Icon size={14} />
                        </span>
                        <span className="settings-shell__nav-label">{tr(item.labelKey, item.fallback)}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <section
          className={cn('settings-shell__card settings-shell__panel', `settings-shell__panel--${activeCategory.tone}`)}
          aria-labelledby="settings-panel-title"
        >
          <div className="settings-shell__card-accent" aria-hidden />
          <div className="settings-shell__panel-header">
            <div className={cn('settings-shell__panel-header-icon', `settings-shell__panel-header-icon--${activeCategory.tone}`)}>
              <ActiveIcon size={16} />
            </div>
            <div className="settings-shell__panel-header-copy">
              <p className="settings-shell__breadcrumb">
                {tr('systemSettings.categories', 'Settings')}
                <span aria-hidden>/</span>
                {tr(activeCategory.labelKey, activeCategory.fallback)}
              </p>
              <h2 id="settings-panel-title" className="settings-shell__panel-heading">
                {category === 'overview'
                  ? tr('systemSettings.overviewTitle', 'Platform overview')
                  : tr(activeCategory.labelKey, activeCategory.fallback)}
              </h2>
              {category === 'overview' ? (
                <p className="settings-shell__panel-subheading">
                  {general.organization}
                </p>
              ) : null}
            </div>
            {category !== 'overview' ? (
              <span className={cn('settings-shell__panel-pill', `settings-shell__panel-pill--${activeCategory.tone}`)}>
                {tr(activeCategory.labelKey, activeCategory.fallback)}
              </span>
            ) : null}
          </div>
          <div className="settings-shell__panel-scroll">
            {renderPanel()}
          </div>
        </section>
      </div>
    </div>
  );
}
