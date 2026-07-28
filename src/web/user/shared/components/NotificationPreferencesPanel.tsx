import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2, Monitor, Plus, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { apiClient, unwrap } from '@shared/services/axiosClient';
import { authAPI, profileAPI } from '@shared/services/api';
import type { UserPreferences } from '@shared/types';
import { humanizeApiError } from '@shared/utils/apiErrors';
import { toast } from 'sonner';
import { cn } from '@shared/components/ui/utils';

type PushDevice = {
  id: string;
  platform: string;
  device_name: string;
  has_fcm?: boolean;
  has_web_push?: boolean;
  last_used?: string;
  created?: string;
};

type PrefsForm = Pick<
  UserPreferences,
  | 'notify_fines'
  | 'notify_detections'
  | 'notify_alerts'
  | 'notify_system'
  | 'login_notifications'
>;

const DEFAULT_PREFS: PrefsForm = {
  notify_fines: true,
  notify_detections: true,
  notify_alerts: true,
  notify_system: true,
  login_notifications: true,
};

function prefsFromApi(p: UserPreferences | undefined | null): PrefsForm {
  if (!p) return { ...DEFAULT_PREFS };
  return {
    notify_fines: p.notify_fines !== false,
    notify_detections: p.notify_detections !== false,
    notify_alerts: p.notify_alerts !== false,
    notify_system: p.notify_system !== false,
    login_notifications: p.login_notifications !== false,
  };
}

const CATEGORY_ROWS: { key: keyof PrefsForm; labelKey: string; hintKey: string }[] = [
  { key: 'notify_fines', labelKey: 'notifSettings.catFines', hintKey: 'notifSettings.catFinesHint' },
  { key: 'notify_detections', labelKey: 'notifSettings.catViolations', hintKey: 'notifSettings.catViolationsHint' },
  { key: 'notify_alerts', labelKey: 'notifSettings.catPayments', hintKey: 'notifSettings.catPaymentsHint' },
  { key: 'notify_system', labelKey: 'notifSettings.catAppeals', hintKey: 'notifSettings.catAppealsHint' },
  { key: 'login_notifications', labelKey: 'notifSettings.catLogin', hintKey: 'notifSettings.catLoginHint' },
];

export function NotificationPreferencesPanel() {
  const { t } = useLanguage();
  const { user, updateUser } = useAuth();
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [prefs, setPrefs] = useState<PrefsForm>({ ...DEFAULT_PREFS });
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const data = unwrap<{ devices: PushDevice[] }>(
        await apiClient.get('/notifications/push/devices/'),
      );
      setDevices(Array.isArray(data?.devices) ? data.devices : []);
    } catch {
      setDevices([]);
    }
  }, []);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await profileAPI.getOverview();
      setPrefs(prefsFromApi(overview.preferences));
      if (overview.user?.phone) setPhone(overview.user.phone);
    } catch {
      setPrefs({ ...DEFAULT_PREFS });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
    void loadPrefs();
  }, [loadDevices, loadPrefs]);

  useEffect(() => {
    setPhone(user?.phone || '');
  }, [user?.phone]);

  const savePrefs = async (next: Partial<PrefsForm>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setBusy(true);
    try {
      await profileAPI.updatePreferences(merged);
      toast.success(t('notifSettings.toastPrefsSaved'));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? humanizeApiError(err.message)
          : t('notifSettings.toastPrefsFail'),
      );
      void loadPrefs();
    } finally {
      setBusy(false);
    }
  };

  const registerDevice = async () => {
    setBusy(true);
    try {
      if (typeof Notification !== 'undefined') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error(t('notifSettings.toastPermissionDenied'));
          return;
        }
      }
      await apiClient.post('/notifications/push/register/', {
        platform: 'web',
        device_name: navigator.userAgent.includes('Chrome')
          ? 'Chrome Browser'
          : navigator.userAgent.includes('Firefox')
            ? 'Firefox Browser'
            : 'Web Browser',
        web_push_endpoint: `web-${user?.id || 'anon'}-${Date.now()}`,
        web_push_p256dh: 'pending-subscription',
        web_push_auth: 'pending-auth',
      });
      toast.success(t('notifSettings.toastDeviceAdded'));
      await loadDevices();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? humanizeApiError(err.message)
          : t('notifSettings.toastDeviceFail'),
      );
    } finally {
      setBusy(false);
    }
  };

  const unregisterDevice = async (deviceId: string) => {
    setBusy(true);
    try {
      await apiClient.post('/notifications/push/unregister/', { device_id: deviceId });
      toast.success(t('notifSettings.toastDeviceRemoved'));
      await loadDevices();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? humanizeApiError(err.message)
          : t('notifSettings.toastDeviceFail'),
      );
    } finally {
      setBusy(false);
    }
  };

  const savePhone = async () => {
    setBusy(true);
    try {
      const updated = await authAPI.updateProfile({ phone: phone.trim() });
      updateUser(updated);
      toast.success(t('notifSettings.toastPhoneSaved'));
    } catch (err) {
      toast.error(
        err instanceof Error
          ? humanizeApiError(err.message)
          : t('notifSettings.toastPhoneFail'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="notif-settings__loading">
        <Loader2 className="animate-spin" size={22} />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="notif-settings">
      <section className="notif-settings__card">
        <div className="notif-settings__card-head">
          <span className="notif-settings__card-icon notif-settings__card-icon--blue">
            <Bell size={16} />
          </span>
          <div>
            <h3 className="notif-settings__card-title">{t('notifSettings.channelsTitle')}</h3>
            <p className="notif-settings__card-desc">{t('notifSettings.channelsHint')}</p>
          </div>
        </div>

        <div className="notif-settings__rows">
          {CATEGORY_ROWS.map((row) => (
            <label key={row.key} className="notif-settings__row">
              <div className="min-w-0">
                <p className="notif-settings__row-title">{t(row.labelKey)}</p>
                <p className="notif-settings__row-hint">{t(row.hintKey)}</p>
              </div>
              <Switch
                checked={prefs[row.key]}
                disabled={busy}
                onCheckedChange={(checked) => void savePrefs({ [row.key]: checked })}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="notif-settings__card">
        <div className="notif-settings__card-head">
          <span className="notif-settings__card-icon notif-settings__card-icon--cyan">
            <Smartphone size={16} />
          </span>
          <div>
            <h3 className="notif-settings__card-title">{t('notifSettings.smsTitle')}</h3>
            <p className="notif-settings__card-desc">{t('notifSettings.smsHint')}</p>
          </div>
        </div>
        <div className="notif-settings__phone">
          <Label htmlFor="notif-phone">{t('notifSettings.phoneLabel')}</Label>
          <div className="notif-settings__phone-row">
            <Input
              id="notif-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 XX XXX XXX"
              disabled={busy}
            />
            <Button type="button" disabled={busy} onClick={() => void savePhone()}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : null}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </section>

      <section className="notif-settings__card">
        <div className="notif-settings__card-head">
          <span className="notif-settings__card-icon notif-settings__card-icon--violet">
            <Monitor size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="notif-settings__card-title">{t('notifSettings.devicesTitle')}</h3>
            <p className="notif-settings__card-desc">{t('notifSettings.devicesHint')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="notif-settings__add-device"
            disabled={busy}
            onClick={() => void registerDevice()}
          >
            <Plus size={14} />
            {t('notifSettings.addDevice')}
          </Button>
        </div>

        {devices.length === 0 ? (
          <p className="notif-settings__empty">{t('notifSettings.noDevices')}</p>
        ) : (
          <div className="notif-settings__devices">
            {devices.map((d) => (
              <div key={d.id} className="notif-settings__device">
                <span className={cn('notif-settings__device-icon')}>
                  <Monitor size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="notif-settings__device-name">{d.device_name || d.platform}</p>
                  <p className="notif-settings__device-meta">{d.platform}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void unregisterDevice(d.id)}
                  aria-label={t('notifSettings.removeDevice')}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
