import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  LayoutGrid,
  Monitor,
  Moon,
  Paintbrush,
  PanelLeft,
  RotateCcw,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAppearance } from '@shared/context/AppearanceContext';
import {
  ACCENT_PRESETS,
  APPEARANCE_PALETTES,
  HEADER_COLOR_PRESETS,
  PAGE_SHELL_PRESETS,
  SIDEBAR_COLOR_PRESETS,
  hasCustomAppearance,
  normalizeHex,
  type AppearancePalette,
  type AppearanceZone,
  type ColorPreset,
} from '@shared/config/appearanceColors';

/** Max swatch diameter; grid uses equal columns so nothing is clipped */
const SWATCH_MAX = 40;

type ThemeChoice = 'light' | 'dark' | 'system';

const THEME_OPTS: { id: ThemeChoice; color: string; light?: boolean; labelKey: 'theme.light' | 'theme.dark' | 'theme.system'; Icon: typeof Sun }[] = [
  { id: 'light', color: '#ffffff', light: true, labelKey: 'theme.light', Icon: Sun },
  { id: 'dark', color: '#0f172a', labelKey: 'theme.dark', Icon: Moon },
  { id: 'system', color: '#64748b', labelKey: 'theme.system', Icon: Monitor },
];

function SwatchBtn({
  color,
  light,
  active,
  title,
  onClick,
}: {
  color: string;
  light?: boolean;
  active: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={title}
      title={title}
      onClick={onClick}
      className="appearance-swatch-btn"
      style={{
        maxWidth: SWATCH_MAX,
        backgroundColor: color,
        border: active ? '2px solid #3b82f6' : light ? '1.5px solid #d1d5db' : '1.5px solid rgba(0,0,0,0.12)',
        boxShadow: active ? '0 0 0 2px #fff, 0 0 0 4px #3b82f6' : 'none',
      }}
    >
      {active && (
        <Check size={14} strokeWidth={3} color={light ? '#111827' : '#fff'} />
      )}
    </button>
  );
}

function SwatchGrid({
  presets,
  selected,
  onPick,
  cols,
  t,
}: {
  presets: ColorPreset[];
  selected: string | null;
  onPick: (v: string | null) => void;
  cols: 6 | 5 | 3;
  t: (k: string) => string;
}) {
  return (
    <div
      className={`appearance-swatch-grid appearance-swatch-grid--cols-${cols}`}
      role="radiogroup"
    >
      {presets.map((p) => (
        <SwatchBtn
          key={p.id}
          color={p.value}
          light={p.light}
          active={selected === p.value}
          title={p.nameKey ? t(p.nameKey) : p.id}
          onClick={() => onPick(selected === p.value ? null : p.value)}
        />
      ))}
    </div>
  );
}

function HexInput({
  value,
  onApply,
  placeholder,
}: {
  value: string | null;
  onApply: (hex: string | null) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  return (
    <div className="appearance-hex-row">
      <input
        type="text"
        className="appearance-hex-input"
        value={draft}
        placeholder={placeholder}
        maxLength={7}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const hex = normalizeHex(draft);
            if (hex) onApply(hex);
          }
        }}
      />
      <button
        type="button"
        className="appearance-hex-apply"
        onClick={() => {
          const hex = normalizeHex(draft);
          if (hex) onApply(hex);
        }}
      >
        OK
      </button>
    </div>
  );
}

function ColorZoneCard({
  title,
  hint,
  icon: Icon,
  presets,
  selected,
  zone,
  cols,
  onPick,
  onReset,
  showSync,
  onSync,
  t,
}: {
  title: string;
  hint: string;
  icon: typeof LayoutGrid;
  presets: ColorPreset[];
  selected: string | null;
  zone: AppearanceZone;
  cols: 6 | 5 | 3;
  onPick: (zone: AppearanceZone, v: string | null) => void;
  onReset: (zone: AppearanceZone) => void;
  showSync?: boolean;
  onSync?: () => void;
  t: (k: string) => string;
}) {
  const selectedPreset = presets.find((p) => p.value === selected);

  return (
    <article className="appearance-card">
      <div className="appearance-card__head">
        <div className="appearance-card__icon">
          <Icon size={16} />
        </div>
        <div className="appearance-card__meta">
          <h3 className="appearance-card__title">{title}</h3>
          <p className="appearance-card__hint">{hint}</p>
        </div>
        <div
          className="appearance-card__preview"
          style={{ backgroundColor: selected ?? undefined }}
          data-empty={!selected}
          aria-hidden
        />
      </div>

      {selected && (
        <p className="appearance-selected-label">
          <span
            className="appearance-selected-label__swatch"
            style={{ backgroundColor: selected }}
          />
          <span className="appearance-selected-label__text">
            <strong>{selectedPreset?.nameKey ? t(selectedPreset.nameKey) : t('appearance.customColor')}</strong>
            <span className="appearance-selected-label__hex">{selected.toUpperCase()}</span>
          </span>
        </p>
      )}

      <SwatchGrid presets={presets} selected={selected} onPick={(v) => onPick(zone, v)} cols={cols} t={t} />

      <HexInput
        value={selected}
        onApply={(hex) => onPick(zone, hex)}
        placeholder="#2563eb"
      />

      <div className="appearance-card__actions">
        {showSync && onSync && (
          <button type="button" className="appearance-card__link" onClick={onSync}>
            <Copy size={12} />
            {t('appearance.syncNavbar')}
          </button>
        )}
        {selected && (
          <button type="button" className="appearance-card__link appearance-card__link--muted" onClick={() => onReset(zone)}>
            <RotateCcw size={12} />
            {t('appearance.resetSection')}
          </button>
        )}
      </div>
    </article>
  );
}

function LivePreview({ colors }: { colors: Record<string, string | null> }) {
  return (
    <div className="appearance-live-preview" aria-hidden>
      <div className="appearance-live-preview__frame">
        <div
          className="appearance-live-preview__sidebar"
          style={{ backgroundColor: colors.sidebar ?? '#0f172a' }}
        />
        <div className="appearance-live-preview__main">
          <div
            className="appearance-live-preview__logo"
            style={{ backgroundColor: colors.logoHeader ?? colors.sidebar ?? '#1e293b' }}
          />
          <div
            className="appearance-live-preview__navbar"
            style={{ backgroundColor: colors.navbar ?? '#2563eb' }}
          />
          <div
            className="appearance-live-preview__content"
            style={{ backgroundColor: colors.pageShell ?? '#eef2f9' }}
          />
        </div>
      </div>
    </div>
  );
}

export function AppearanceSettingsPanel() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { colors, setZoneColor, applyPalette, syncNavbarToLogo, resetZone, resetAll } = useAppearance();

  const activeTheme = (theme ?? 'system') as ThemeChoice;
  const custom = hasCustomAppearance(colors);

  const onPalette = (p: AppearancePalette) => applyPalette(p, setTheme);

  return (
    <div className="appearance-settings">
      <header className="appearance-settings__header">
        <div>
          <h2 className="appearance-settings__title">{t('appearance.settings')}</h2>
          <p className="appearance-settings__subtitle">{t('appearance.subtitle')}</p>
        </div>
        <div className="appearance-settings__header-aside" aria-hidden>
          <Sparkles size={20} className="appearance-settings__sparkle" />
        </div>
      </header>

      <div className="appearance-settings__scroll">
        <LivePreview colors={colors} />

        <section className="appearance-card appearance-card--palettes">
          <h3 className="appearance-section-label">{t('appearance.quickThemes')}</h3>
          <p className="appearance-card__hint" style={{ marginTop: 0, marginBottom: 10 }}>
            {t('appearance.quickThemesHint')}
          </p>
          <div className="appearance-palette-list">
            {APPEARANCE_PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                className="appearance-palette-btn"
                onClick={() => onPalette(p)}
              >
                <span className="appearance-palette-btn__dots">
                  {p.preview.map((c) => (
                    <span key={c} style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="appearance-palette-btn__text">
                  <strong>{t(p.nameKey)}</strong>
                  <small>{t(p.descKey)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="appearance-card">
          <h3 className="appearance-section-label">{t('appearance.themeMode')}</h3>
          <p className="appearance-card__hint" style={{ marginTop: 0, marginBottom: 12 }}>
            {t('appearance.themeModeHint')}
          </p>
          <div className="appearance-theme-labeled">
            {THEME_OPTS.map((opt) => (
              <div key={opt.id} className="appearance-theme-item">
                <SwatchBtn
                  color={opt.color}
                  light={opt.light}
                  active={activeTheme === opt.id}
                  title={t(opt.labelKey)}
                  onClick={() => setTheme(opt.id)}
                />
                <span className={activeTheme === opt.id ? 'appearance-theme-item__label--active' : ''}>
                  {t(opt.labelKey)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <ColorZoneCard
          title={t('appearance.logoHeader')}
          hint={t('appearance.logoHeaderHint')}
          icon={LayoutGrid}
          presets={HEADER_COLOR_PRESETS}
          selected={colors.logoHeader}
          zone="logoHeader"
          cols={5}
          onPick={setZoneColor}
          onReset={resetZone}
          t={t}
        />

        <ColorZoneCard
          title={t('appearance.navbarHeader')}
          hint={t('appearance.navbarHeaderHint')}
          icon={PanelLeft}
          presets={HEADER_COLOR_PRESETS}
          selected={colors.navbar}
          zone="navbar"
          cols={5}
          onPick={setZoneColor}
          onReset={resetZone}
          showSync
          onSync={syncNavbarToLogo}
          t={t}
        />

        <ColorZoneCard
          title={t('appearance.sidebar')}
          hint={t('appearance.sidebarHint')}
          icon={PanelLeft}
          presets={SIDEBAR_COLOR_PRESETS}
          selected={colors.sidebar}
          zone="sidebar"
          cols={3}
          onPick={setZoneColor}
          onReset={resetZone}
          t={t}
        />

        <ColorZoneCard
          title={t('appearance.pageShell')}
          hint={t('appearance.pageShellHint')}
          icon={Paintbrush}
          presets={PAGE_SHELL_PRESETS}
          selected={colors.pageShell}
          zone="pageShell"
          cols={5}
          onPick={setZoneColor}
          onReset={resetZone}
          t={t}
        />

        <ColorZoneCard
          title={t('appearance.accent')}
          hint={t('appearance.accentHint')}
          icon={Sparkles}
          presets={ACCENT_PRESETS}
          selected={colors.accent}
          zone="accent"
          cols={5}
          onPick={setZoneColor}
          onReset={resetZone}
          t={t}
        />

        {custom && (
          <button type="button" className="appearance-settings__reset" onClick={resetAll}>
            {t('appearance.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
