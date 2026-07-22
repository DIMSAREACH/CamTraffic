import { useCallback, useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useLanguage } from '@shared/context/LanguageContext';
import { toast } from 'sonner';
import type { NotificationType } from '@shared/types';

const STORAGE_KEY = 'camtraffic_notification_templates';

type TemplateFields = { subject: string; body: string };

const DEFAULT_TEMPLATES: Record<NotificationType, TemplateFields> = {
  fine: {
    subject: 'Traffic fine issued — {plate}',
    body: 'A fine of {amount} was issued for {violation} on {date}.',
  },
  detection: {
    subject: 'Sign detected — {sign}',
    body: 'Camera {camera} detected {sign} with {confidence}% confidence.',
  },
  alert: {
    subject: 'System alert — {title}',
    body: '{message} Reported at {time}.',
  },
  system: {
    subject: 'CamTraffic system notice',
    body: '{message}',
  },
};

const TYPES: NotificationType[] = ['fine', 'detection', 'alert', 'system'];

function loadTemplates(): Record<NotificationType, TemplateFields> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TEMPLATES };
    const parsed = JSON.parse(raw) as Partial<Record<NotificationType, TemplateFields>>;
    return { ...DEFAULT_TEMPLATES, ...parsed };
  } catch {
    return { ...DEFAULT_TEMPLATES };
  }
}

export function NotificationTemplatesManagementPanel() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState(loadTemplates);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const updateField = useCallback(
    (type: NotificationType, field: keyof TemplateFields, value: string) => {
      setTemplates((prev) => ({
        ...prev,
        [type]: { ...prev[type], [field]: value },
      }));
    },
    [],
  );

  const handleSave = () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
      toast.success(t('notificationTemplates.saved'));
    } catch {
      toast.error(t('notificationTemplates.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="enforcement-page__panel p-5 mt-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <h2 className="font-semibold text-lg">{t('notificationTemplates.title')}</h2>
        </div>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          <Save size={14} className="mr-1.5" />
          {t('notificationTemplates.save')}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t('notificationTemplates.hint')}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TYPES.map((type) => {
          const labelKey = {
            fine: 'notifications.typeFine',
            detection: 'notifications.typeDetection',
            alert: 'notifications.typeAlert',
            system: 'notifications.typeSystem',
          }[type];
          return (
          <div key={type} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <p className="text-sm font-semibold">{t(labelKey)}</p>
            <div>
              <Label htmlFor={`tpl-subject-${type}`}>{t('notificationTemplates.subject')}</Label>
              <Input
                id={`tpl-subject-${type}`}
                value={templates[type].subject}
                onChange={(e) => updateField(type, 'subject', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor={`tpl-body-${type}`}>{t('notificationTemplates.body')}</Label>
              <textarea
                id={`tpl-body-${type}`}
                value={templates[type].body}
                onChange={(e) => updateField(type, 'body', e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
