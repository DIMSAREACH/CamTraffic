import { useCallback, useEffect, useState } from 'react';
import {
  Check, Globe, Languages, Loader2, Monitor, Moon, Paintbrush, Save, Sun,
} from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { useLanguage } from '@shared/context/LanguageContext';
import { PAGE_SHELL_PRESETS } from '@shared/config/appearanceColors';
import { settingsAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';
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

const MODE_OPTS: {
  id: ThemeAdminConfig['mode'];
  labelKey: string;
  fallback: string;
  Icon: typeof Sun;
  tone: 'amber' | 'slate' | 'cyan';
}[] = [
  { id: 'light', labelKey: 'theme.light', fallback: 'Light', Icon: Sun, tone: 'amber' },
  { id: 'dark', labelKey: 'theme.dark', fallback: 'Dark', Icon: Moon, tone: 'slate' },
  { id: 'system', labelKey: 'theme.system', fallback: 'System', Icon: Monitor, tone: 'cyan' },
];

function shortKey(key: string) {
  const parts = key.split('.');
  return parts[parts.length - 1] || key;
}

export function LanguageThemeManagementPanel({ embedded = false }: { embedded?: boolean }) {
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
        const saved = themeRes.value.value as Partial<ThemeAdminConfig>;
        setThemeConfig({
          ...DEFAULT_THEME,
          preset: typeof saved.preset === 'string' ? saved.preset : DEFAULT_THEME.preset,
          mode: saved.mode === 'light' || saved.mode === 'dark' || saved.mode === 'system'
            ? saved.mode
            : DEFAULT_THEME.mode,
        });
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

  const activePreset = PAGE_SHELL_PRESETS.find((p) => p.value === themeConfig.preset);
  const filledOverrides = Object.values(overrides).filter((v) => v.trim()).length;

  if (loading) {
    return (
      <div className="lang-appear lang-appear--loading">
        <Loader2 size={18} className="lang-appear__spinner" />
        <p>{tr('common.loading', 'Loading…')}</p>
      </div>
    );
  }

  return (
    <section className={cn('lang-appear', embedded ? 'lang-appear--embedded' : 'lang-appear--standalone')}>
      {!embedded && (
        <div className="lang-appear__topbar">
          <div className="lang-appear__topbar-copy">
            <span className="lang-appear__topbar-icon"><Globe size={16} /></span>
            <div>
              <h2 className="lang-appear__topbar-title">{tr('languageTheme.title', 'Language & theme')}</h2>
              <p className="lang-appear__topbar-sub">
                {tr('languageTheme.topHint', 'Customize navigation labels and portal appearance')}
              </p>
            </div>
          </div>
          <Button type="button" className="lang-appear__save-btn" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 size={14} className="lang-appear__spinner mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {tr('languageTheme.save', 'Save')}
          </Button>
        </div>
      )}

      <div className="lang-appear__stats">
        <div className="lang-appear__stat lang-appear__stat--indigo">
          <Languages size={15} />
          <div>
            <p className="lang-appear__stat-value">{filledOverrides}/{NAV_KEYS.length}</p>
            <p className="lang-appear__stat-label">{tr('languageTheme.statOverrides', 'Label overrides')}</p>
          </div>
        </div>
        <div className="lang-appear__stat lang-appear__stat--cyan">
          <Paintbrush size={15} />
          <div>
            <p className="lang-appear__stat-value">
              {activePreset
                ? (activePreset.nameKey ? tr(activePreset.nameKey, activePreset.id) : activePreset.id)
                : '—'}
            </p>
            <p className="lang-appear__stat-label">{tr('languageTheme.shellPreset', 'Page shell color')}</p>
          </div>
        </div>
        <div className="lang-appear__stat lang-appear__stat--amber">
          <Monitor size={15} />
          <div>
            <p className="lang-appear__stat-value">
              {tr(`theme.${themeConfig.mode}`, themeConfig.mode)}
            </p>
            <p className="lang-appear__stat-label">{tr('languageTheme.themeMode', 'Color mode')}</p>
          </div>
        </div>
      </div>

      <div className="lang-appear__section lang-appear__section--language">
        <div className="lang-appear__section-head">
          <span className="lang-appear__section-icon lang-appear__section-icon--indigo">
            <Languages size={15} />
          </span>
          <div>
            <h3 className="lang-appear__section-title">
              {tr('languageTheme.languageSection', 'Navigation labels')}
            </h3>
            <p className="lang-appear__section-desc">
              {tr('languageTheme.languageHint', 'Override common sidebar labels. Leave blank to use default translations.')}
            </p>
          </div>
        </div>

        <div className="lang-appear__label-grid">
          {NAV_KEYS.map((key) => {
            const hasCustom = Boolean(overrides[key]?.trim());
            return (
              <div
                key={key}
                className={cn('lang-appear__label-card', hasCustom && 'lang-appear__label-card--custom')}
              >
                <div className="lang-appear__label-meta">
                  <span className="lang-appear__label-badge">{shortKey(key)}</span>
                  {hasCustom ? (
                    <span className="lang-appear__label-flag">
                      <Check size={11} />
                      {tr('languageTheme.custom', 'Custom')}
                    </span>
                  ) : null}
                </div>
                <p className="lang-appear__label-current">{tr(key, key)}</p>
                <Label htmlFor={`lang-${key}`} className="sr-only">{key}</Label>
                <Input
                  id={`lang-${key}`}
                  value={overrides[key] ?? ''}
                  onChange={(e) => updateOverride(key, e.target.value)}
                  placeholder={tr(key, key)}
                  className="lang-appear__label-input"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="lang-appear__section lang-appear__section--theme">
        <div className="lang-appear__section-head">
          <span className="lang-appear__section-icon lang-appear__section-icon--cyan">
            <Paintbrush size={15} />
          </span>
          <div>
            <h3 className="lang-appear__section-title">
              {tr('languageTheme.themeSection', 'Admin theme preset')}
            </h3>
            <p className="lang-appear__section-desc">
              {tr('languageTheme.themeHint', 'Default shell colors for the admin portal (saved server-side).')}
            </p>
          </div>
        </div>

        <div className="lang-appear__theme-layout">
          <div className="lang-appear__theme-controls">
            <div>
              <p className="lang-appear__field-label">{tr('languageTheme.shellPreset', 'Page shell color')}</p>
              <div className="lang-appear__swatch-row" role="radiogroup" aria-label={tr('languageTheme.shellPreset', 'Page shell color')}>
                {PAGE_SHELL_PRESETS.map((p) => {
                  const active = themeConfig.preset === p.value;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      title={p.nameKey ? tr(p.nameKey, p.id) : p.id}
                      className={cn('lang-appear__swatch', active && 'lang-appear__swatch--active', p.light && 'lang-appear__swatch--light')}
                      style={{ backgroundColor: p.value }}
                      onClick={() => setThemeConfig((c) => ({ ...c, preset: p.value }))}
                    >
                      {active ? <Check size={14} strokeWidth={3} color={p.light ? '#0f172a' : '#fff'} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="lang-appear__field-label">{tr('languageTheme.themeMode', 'Color mode')}</p>
              <div className="lang-appear__mode-row" role="radiogroup" aria-label={tr('languageTheme.themeMode', 'Color mode')}>
                {MODE_OPTS.map(({ id, labelKey, fallback, Icon, tone }) => {
                  const active = themeConfig.mode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={cn(
                        'lang-appear__mode-card',
                        `lang-appear__mode-card--${tone}`,
                        active && 'lang-appear__mode-card--active',
                      )}
                      onClick={() => setThemeConfig((c) => ({ ...c, mode: id }))}
                    >
                      <span className="lang-appear__mode-icon"><Icon size={16} /></span>
                      <span>{tr(labelKey, fallback)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lang-appear__preview" aria-hidden>
            <div className="lang-appear__preview-chrome">
              <span />
              <span />
              <span />
            </div>
            <div className="lang-appear__preview-shell" style={{ backgroundColor: themeConfig.preset }}>
              <div className={cn(
                'lang-appear__preview-sidebar',
                themeConfig.mode === 'dark' && 'lang-appear__preview-sidebar--dark',
              )}
              />
              <div className="lang-appear__preview-main">
                <div className={cn(
                  'lang-appear__preview-card',
                  themeConfig.mode === 'dark' && 'lang-appear__preview-card--dark',
                )}
                />
                <div className={cn(
                  'lang-appear__preview-card lang-appear__preview-card--sm',
                  themeConfig.mode === 'dark' && 'lang-appear__preview-card--dark',
                )}
                />
              </div>
            </div>
            <p className="lang-appear__preview-caption">
              {tr('languageTheme.preview', 'Live preview')}
            </p>
          </div>
        </div>
      </div>

      {embedded ? (
        <div className="settings-shell__actions lang-appear__actions">
          <Button
            type="button"
            className="lang-appear__save-btn"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 size={14} className="lang-appear__spinner mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            {tr('languageTheme.save', 'Save')}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
