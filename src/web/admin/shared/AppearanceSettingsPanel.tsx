import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAppearance } from '@shared/context/AppearanceContext';
import {
  HEADER_COLOR_PRESETS,
  SIDEBAR_COLOR_PRESETS,
  type AppearanceZone,
} from '@shared/config/appearanceColors';

const SWATCH_SIZE = 28;

type ThemeChoice = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { id: ThemeChoice; color: string; light?: boolean; labelKey: 'theme.light' | 'theme.dark' | 'theme.system' }[] = [
  { id: 'light', color: '#ffffff', light: true, labelKey: 'theme.light' },
  { id: 'dark', color: '#0f172a', labelKey: 'theme.dark' },
  { id: 'system', color: '#64748b', labelKey: 'theme.system' },
];

function ColorSwatchButton({
  color,
  light,
  active,
  label,
  onClick,
}: {
  color: string;
  light?: boolean;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="appearance-swatch-btn"
      style={{
        width: SWATCH_SIZE,
        height: SWATCH_SIZE,
        minWidth: SWATCH_SIZE,
        minHeight: SWATCH_SIZE,
        borderRadius: '50%',
        backgroundColor: color,
        border: active
          ? '2px solid #3b82f6'
          : light
            ? '1.5px solid #d1d5db'
            : '1.5px solid rgba(0, 0, 0, 0.1)',
        boxShadow: active ? '0 0 0 2px #ffffff, 0 0 0 4px #3b82f6' : 'none',
        cursor: 'pointer',
        padding: 0,
        margin: 0,
        position: 'relative',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
      }}
    >
      {active && (
        <Check
          size={14}
          strokeWidth={3}
          color={light ? '#111827' : '#ffffff'}
          style={{ filter: light ? 'none' : 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}
        />
      )}
    </button>
  );
}

function SwatchRow({
  colors,
  selected,
  onPick,
  columns,
}: {
  colors: { id: string; value: string; light?: boolean }[];
  selected: string | null;
  onPick: (value: string | null) => void;
  columns: 8 | 3;
}) {
  return (
    <div
      className="appearance-swatch-row"
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, ${SWATCH_SIZE}px)`,
        gap: '8px 6px',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      {colors.map((c) => (
        <ColorSwatchButton
          key={c.id}
          color={c.value}
          light={c.light}
          active={selected === c.value}
          label={c.id}
          onClick={() => onPick(selected === c.value ? null : c.value)}
        />
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h3
        className="appearance-section-label"
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function AppearanceSettingsPanel() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { colors, setZoneColor, resetAll } = useAppearance();

  const activeTheme = (theme ?? 'system') as ThemeChoice;
  const hasCustom =
    colors.logoHeader !== null || colors.navbar !== null || colors.sidebar !== null;

  const pick = (zone: AppearanceZone) => (value: string | null) => setZoneColor(zone, value);

  return (
    <div
      className="appearance-settings"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#ffffff',
        color: '#374151',
      }}
    >
      <header
        style={{
          flexShrink: 0,
          padding: '14px 40px 14px 16px',
          background: '#3b82f6',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
          {t('appearance.settings')}
        </h2>
      </header>

      <div
        className="appearance-settings__scroll"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '18px 16px 20px',
          backgroundColor: '#ffffff',
        }}
      >
        <Section title={t('appearance.themeMode')}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {THEME_OPTIONS.map((opt) => (
              <ColorSwatchButton
                key={opt.id}
                color={opt.color}
                light={opt.light}
                active={activeTheme === opt.id}
                label={t(opt.labelKey)}
                onClick={() => setTheme(opt.id)}
              />
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>
            {t('appearance.themeModeHint')}
          </p>
        </Section>

        <Section title={t('appearance.logoHeader')}>
          <SwatchRow
            colors={HEADER_COLOR_PRESETS}
            selected={colors.logoHeader}
            onPick={pick('logoHeader')}
            columns={8}
          />
        </Section>

        <Section title={t('appearance.navbarHeader')}>
          <SwatchRow
            colors={HEADER_COLOR_PRESETS}
            selected={colors.navbar}
            onPick={pick('navbar')}
            columns={8}
          />
        </Section>

        <Section title={t('appearance.sidebar')}>
          <SwatchRow
            colors={SIDEBAR_COLOR_PRESETS}
            selected={colors.sidebar}
            onPick={pick('sidebar')}
            columns={3}
          />
        </Section>

        {hasCustom && (
          <button
            type="button"
            onClick={resetAll}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#3b82f6',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            {t('appearance.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
