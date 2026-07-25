import { useCallback, useEffect, useState } from 'react';
import { Bell, Monitor, Plus, Trash2 } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { useAuth } from '@shared/context/AuthContext';
import { apiClient, unwrap } from '@shared/services/axiosClient';
import { authAPI } from '@shared/services/api';
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

export default function NotificationSettingsPage() {
  const { user, updateUser } = useAuth();
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const raw = localStorage.getItem('camtraffic_notification_prefs');
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await unwrap<{ devices: PushDevice[] }>(
        await apiClient.get('/notifications/push/devices/'),
      );
      setDevices(data.devices || []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    setPhone(user?.phone || '');
  }, [user?.phone]);

  const savePrefs = (next: Partial<Prefs>) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    localStorage.setItem('camtraffic_notification_prefs', JSON.stringify(merged));
    toast.success('Preferences saved');
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
            onCheckedChange={(checked) => savePrefs({ push_enabled: checked })}
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
                    <p className="text-sm font-medium">{d.device_name}</p>
                    <p className="text-xs capitalize text-slate-500">{d.platform}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void unregisterDevice(d.id)}>
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
            <p className="text-sm text-slate-500">Critical fine and payment messages</p>
          </div>
          <Switch
            checked={prefs.sms_enabled}
            onCheckedChange={(checked) => savePrefs({ sms_enabled: checked })}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 XX XXX XXX"
            />
            <Button disabled={busy} onClick={() => void savePhone()}>Save</Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        {(
          [
            ['fine_notifications', 'Fine notifications'],
            ['violation_notifications', 'Violation alerts'],
            ['payment_notifications', 'Payment confirmations'],
            ['appeal_notifications', 'Appeal updates'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-1">
            <p className="text-sm font-medium">{label}</p>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(checked) => savePrefs({ [key]: checked })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
