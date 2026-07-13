import { useCallback, useEffect, useState } from 'react';
import { Globe, Paintbrush, Save } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/components/ui/select';
import { useLanguage } from '@shared/context/LanguageContext';
import { PAGE_SHELL_PRESETS } from '@shared/config/appearanceColors';
import { settingsAPI } from '@shared/services/api';
import { toast } from 'sonner';

const LANGUAGE_KEY = 'language_overrides';
const THEME_KEY = 'theme_admin_config';

type ThemeAdminConfig = {
  preset: string;
  mode: 'light' | 'dark' | 'system';
};

const NAV_KEYS = [
  'sidebar.nav.dashboard',
  'sidebar.nav.cameras',
  'sidebar.nav.aiDetectionCenter',
  'sidebar.nav.trafficSigns',
  'sidebar.nav.fineManagement',
  'sidebar.nav.allVehicles',
  'sidebar.nav.aiDashboard',
  'sidebar.nav.reports',
  'sidebar.nav.backupRestore',
] as const;

const DEFAULT_THEME: ThemeAdminConfig = {
  preset: PAGE_SHELL_PRESETS[0]?.value ?? '#eef2f9',
  mode: 'system',
};

export function LanguageThemeManagementPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v !== key ? v : fallback;
  };

  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [themeConfig, setThemeConfig] = useState<ThemeAdminConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [langRes, themeRes] = await Promise.allSettled([
        settingsAPI.get(LANGUAGE_KEY),
        settingsAPI.get(THEME_KEY),
      ]);
      if (langRes.status === 'fulfilled' && langRes.value.value && typeof langRes.value.value === 'object') {
        setOverrides(langRes.value.value as Record<string, string>);
      }
      if (themeRes.status === 'fulfilled' && themeRes.value.value && typeof themeRes.value.value === 'object') {
        setThemeConfig({ ...DEFAULT_THEME, ...(themeRes.value.value as ThemeAdminConfig) });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateOverride = (key: string, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmed: Record<string, string> = {};
      for (const [key, value] of Object.entries(overrides)) {
        if (value.trim()) trimmed[key] = value.trim();
      }
      await Promise.all([
        settingsAPI.save(LANGUAGE_KEY, trimmed, 'Admin nav language overrides').catch(() =>
          settingsAPI.update(LANGUAGE_KEY, trimmed),
        ),
        settingsAPI.save(THEME_KEY, themeConfig, 'Admin theme preset').catch(() =>
          settingsAPI.update(THEME_KEY, themeConfig),
        ),
      ]);
      toast.success(tr('languageTheme.saved', 'Language & theme settings saved'));
    } catch {
      toast.error(tr('languageTheme.saveFailed', 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="enforcement-page__panel p-5 mt-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-violet-600" />
          <h2 className="font-semibold text-lg">{tr('languageTheme.title', 'Language & theme')}</h2>
        </div>
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving || loading}>
          <Save size={14} className="mr-1.5" />
          {tr('languageTheme.save', 'Save')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{tr('common.loading', 'Loading…')}</p>
      ) : (
        <>
          <div>
            <h3 className="font-medium mb-1">{tr('languageTheme.languageSection', 'Navigation labels')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {tr('languageTheme.languageHint', 'Override common sidebar labels. Leave blank to use default translations.')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {NAV_KEYS.map((key) => (
                <div key={key} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <Label htmlFor={`lang-${key}`} className="text-xs text-muted-foreground">
                    {key}
                  </Label>
                  <p className="text-xs mb-1">{tr(key, key)}</p>
                  <Input
                    id={`lang-${key}`}
                    value={overrides[key] ?? ''}
                    onChange={(e) => updateOverride(key, e.target.value)}
                    placeholder={tr(key, key)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Paintbrush size={16} className="text-blue-600" />
              <h3 className="font-medium">{tr('languageTheme.themeSection', 'Admin theme preset')}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {tr('languageTheme.themeHint', 'Default shell colors for the admin portal (saved server-side).')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div>
                <Label>{tr('languageTheme.shellPreset', 'Page shell color')}</Label>
                <Select
                  value={themeConfig.preset}
                  onValueChange={(v) => setThemeConfig((c) => ({ ...c, preset: v }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_SHELL_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.value}>
                        {p.nameKey ? tr(p.nameKey, p.id) : p.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{tr('languageTheme.themeMode', 'Color mode')}</Label>
                <Select
                  value={themeConfig.mode}
                  onValueChange={(v) => setThemeConfig((c) => ({ ...c, mode: v as ThemeAdminConfig['mode'] }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{tr('theme.light', 'Light')}</SelectItem>
                    <SelectItem value="dark">{tr('theme.dark', 'Dark')}</SelectItem>
                    <SelectItem value="system">{tr('theme.system', 'System')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div
              className="mt-4 h-12 rounded-lg border border-slate-200 dark:border-slate-700"
              style={{ backgroundColor: themeConfig.preset }}
              aria-hidden
            />
          </div>
        </>
      )}
    </section>
  );
}
