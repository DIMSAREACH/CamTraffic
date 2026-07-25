import { useCallback, useEffect, useState } from 'react';
import { Bell, Monitor, Plus, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { useAuth } from '@shared/context/AuthContext';
import { apiClient, unwrap } from '@shared/services/axiosClient';
import { authAPI, profileAPI } from '@shared/services/api';
import type { UserPreferences } from '@shared/types';
import { humanizeApiError } from '@shared/utils/apiErrors';
import { toast } from 'sonner';

type PushDevice = {
  id: string;
  platform: string;
  device_name: string;
  has_fcm?: boolean;
  has_web_push?: boolean;
  last_used?: string;
  created?: string;
};

type Prefs = {
  push_enabled: boolean;
  sms_enabled: boolean;
  fine_notifications: boolean;
  violation_notifications: boolean;
  payment_notifications: boolean;
  appeal_notifications: boolean;
};

const DEFAULT_PREFS: Prefs = {
  push_enabled: true,
  sms_enabled: true,
  fine_notifications: true,
  violation_notifications: true,
  payment_notifications: true,
  appeal_notifications: true,
};

function prefsFromApi(p: UserPreferences | undefined | null): Prefs {
  if (!p) return { ...DEFAULT_PREFS };
  return {
    push_enabled: p.notify_alerts !== false,
    sms_enabled: p.notify_system === true || p.login_notifications === true,
    fine_notifications: p.notify_fines !== false,
    violation_notifications: p.notify_detections !== false,
    payment_notifications: p.notify_alerts !== false,
    appeal_notifications: p.notify_system === true,
  };
}

function prefsToApi(prefs: Prefs): Partial<UserPreferences> {
  return {
    notify_fines: prefs.fine_notifications,
    notify_detections: prefs.violation_notifications,
    notify_alerts: prefs.push_enabled || prefs.payment_notifications,
    notify_system: prefs.appeal_notifications || prefs.sms_enabled,
    login_notifications: prefs.sms_enabled,
  };
}

export default function NotificationSettingsPage() {
  const { user, updateUser } = useAuth();
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS });
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const data = await unwrap<{ devices: PushDevice[] }>(
        await apiClient.get('/notifications/push/devices/'),
      );
      setDevices(data.devices || []);
    } catch {
      setDevices([]);
    }
  }, []);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const overview = await profileAPI.getOverview();
      setPrefs(prefsFromApi(overview.preferences));
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

  const savePrefs = async (next: Partial<Prefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    setBusy(true);
    try {
      await profileAPI.updatePreferences(prefsToApi(merged));
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Could not save preferences');
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
          toast.error('Notification permission denied');
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
      toast.success('Device registered');
      await loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const unregisterDevice = async (deviceId: string) => {
    setBusy(true);
    try {
      await apiClient.post('/notifications/push/unregister/', { device_id: deviceId });
      toast.success('Device removed');
      await loadDevices();
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const savePhone = async () => {
    setBusy(true);
    try {
      const updated = await authAPI.updateProfile({ phone });
      updateUser(updated);
      toast.success('Phone number updated');
    } catch (err) {
      toast.error(err instanceof Error ? humanizeApiError(err.message) : 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
          <Bell className="h-5 w-5" />
          Notification settings
        </h1>
        <p className="text-sm text-slate-500">Push and SMS alerts for fines, violations, and payments</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Push notifications</p>
            <p className="text-sm text-slate-500">Browser / device alerts</p>
          </div>
          <Switch
            checked={prefs.push_enabled}
            disabled={busy || loading}
            onCheckedChange={(checked) => void savePrefs({ push_enabled: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Registered devices</p>
          <Button size="sm" disabled={busy || !prefs.push_enabled} onClick={() => void registerDevice()}>
            <Plus className="mr-1 h-4 w-4" /> Add this device
          </Button>
        </div>

        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        ) : devices.length === 0 ? (
          <p className="text-sm text-slate-500">No devices registered yet.</p>
        ) : (
          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-sm font-medium">{d.device_name || d.platform}</p>
                    <p className="text-xs text-slate-500">{d.platform}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void unregisterDevice(d.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">SMS alerts</p>
            <p className="text-sm text-slate-500">Text messages for important updates</p>
          </div>
          <Switch
            checked={prefs.sms_enabled}
            disabled={busy || loading}
            onCheckedChange={(checked) => void savePrefs({ sms_enabled: checked })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notif-phone">Phone number</Label>
          <div className="flex gap-2">
            <Input
              id="notif-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 XX XXX XXX"
            />
            <Button disabled={busy} onClick={() => void savePhone()}>Save</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="font-medium">Alert categories</p>
        {(
          [
            ['fine_notifications', 'Fine notices'],
            ['violation_notifications', 'Violation detections'],
            ['payment_notifications', 'Payment confirmations'],
            ['appeal_notifications', 'Appeal updates'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <p className="text-sm">{label}</p>
            <Switch
              checked={prefs[key]}
              disabled={busy || loading}
              onCheckedChange={(checked) => void savePrefs({ [key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
