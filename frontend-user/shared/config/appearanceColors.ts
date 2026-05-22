export type AppearanceZone =
  | 'logoHeader'
  | 'navbar'
  | 'sidebar'
  | 'pageShell'
  | 'accent';

export type ColorPreset = {
  id: string;
  value: string;
  nameKey?: string;
  light?: boolean;
};

export const HEADER_COLOR_PRESETS: ColorPreset[] = [
  { id: 'navy', value: '#0f172a', nameKey: 'appearance.color.navy' },
  { id: 'blue-900', value: '#1e3a8a', nameKey: 'appearance.color.blueDark' },
  { id: 'blue', value: '#2563eb', nameKey: 'appearance.color.blue' },
  { id: 'violet', value: '#7c3aed', nameKey: 'appearance.color.violet' },
  { id: 'cyan', value: '#0891b2', nameKey: 'appearance.color.cyan' },
  { id: 'emerald', value: '#059669', nameKey: 'appearance.color.emerald' },
  { id: 'orange', value: '#ea580c', nameKey: 'appearance.color.orange' },
  { id: 'red', value: '#dc2626', nameKey: 'appearance.color.red' },
  { id: 'white', value: '#ffffff', light: true, nameKey: 'appearance.color.white' },
  { id: 'slate', value: '#334155', nameKey: 'appearance.color.slate' },
  { id: 'indigo', value: '#4f46e5', nameKey: 'appearance.color.indigo' },
  { id: 'teal', value: '#0d9488', nameKey: 'appearance.color.teal' },
  { id: 'lime', value: '#65a30d', nameKey: 'appearance.color.lime' },
  { id: 'fuchsia', value: '#c026d3', nameKey: 'appearance.color.fuchsia' },
  { id: 'gray', value: '#64748b', nameKey: 'appearance.color.gray' },
];

export const SIDEBAR_COLOR_PRESETS: ColorPreset[] = [
  { id: 'light', value: '#f8fafc', light: true, nameKey: 'appearance.color.white' },
  { id: 'navy', value: '#0f172a', nameKey: 'appearance.color.navy' },
  { id: 'charcoal', value: '#111827', nameKey: 'appearance.color.charcoal' },
];

export const PAGE_SHELL_PRESETS: ColorPreset[] = [
  { id: 'light', value: '#eef2f9', light: true, nameKey: 'appearance.color.lightGray' },
  { id: 'white', value: '#ffffff', light: true, nameKey: 'appearance.color.white' },
  { id: 'slate', value: '#f1f5f9', light: true, nameKey: 'appearance.color.slateLight' },
  { id: 'dark', value: '#0f172a', nameKey: 'appearance.color.navy' },
  { id: 'charcoal', value: '#111827', nameKey: 'appearance.color.charcoal' },
];

export const ACCENT_PRESETS: ColorPreset[] = [
  { id: 'blue', value: '#2563eb', nameKey: 'appearance.color.blue' },
  { id: 'violet', value: '#7c3aed', nameKey: 'appearance.color.violet' },
  { id: 'cyan', value: '#06b6d4', nameKey: 'appearance.color.cyan' },
  { id: 'emerald', value: '#10b981', nameKey: 'appearance.color.emerald' },
  { id: 'orange', value: '#f97316', nameKey: 'appearance.color.orange' },
  { id: 'red', value: '#ef4444', nameKey: 'appearance.color.red' },
];

export type AppearancePaletteId = 'default' | 'ocean' | 'violet' | 'forest' | 'sunset';

export type AppearancePalette = {
  id: AppearancePaletteId;
  nameKey: string;
  descKey: string;
  preview: [string, string, string];
  colors: AppearanceColors;
  theme?: 'light' | 'dark';
};

export type AppearanceColors = {
  logoHeader: string | null;
  navbar: string | null;
  sidebar: string | null;
  pageShell: string | null;
  accent: string | null;
};

export const DEFAULT_APPEARANCE: AppearanceColors = {
  logoHeader: null,
  navbar: null,
  sidebar: null,
  pageShell: null,
  accent: null,
};

export const APPEARANCE_PALETTES: AppearancePalette[] = [
  {
    id: 'default',
    nameKey: 'appearance.palette.default',
    descKey: 'appearance.palette.defaultDesc',
    preview: ['#7c3aed', '#06b6d4', '#0f172a'],
    colors: { ...DEFAULT_APPEARANCE },
  },
  {
    id: 'ocean',
    nameKey: 'appearance.palette.ocean',
    descKey: 'appearance.palette.oceanDesc',
    preview: ['#0891b2', '#2563eb', '#0f172a'],
    colors: {
      logoHeader: '#1e3a8a',
      navbar: '#0891b2',
      sidebar: '#0f172a',
      pageShell: '#eef2f9',
      accent: '#06b6d4',
    },
    theme: 'light',
  },
  {
    id: 'violet',
    nameKey: 'appearance.palette.violet',
    descKey: 'appearance.palette.violetDesc',
    preview: ['#7c3aed', '#8b5cf6', '#1e1b2e'],
    colors: {
      logoHeader: '#5b21b6',
      navbar: '#7c3aed',
      sidebar: '#1e1b2e',
      pageShell: '#f5f0ff',
      accent: '#8b5cf6',
    },
    theme: 'light',
  },
  {
    id: 'forest',
    nameKey: 'appearance.palette.forest',
    descKey: 'appearance.palette.forestDesc',
    preview: ['#059669', '#10b981', '#0f172a'],
    colors: {
      logoHeader: '#064e3b',
      navbar: '#059669',
      sidebar: '#0f172a',
      pageShell: '#ecfdf5',
      accent: '#10b981',
    },
    theme: 'light',
  },
  {
    id: 'sunset',
    nameKey: 'appearance.palette.sunset',
    descKey: 'appearance.palette.sunsetDesc',
    preview: ['#ea580c', '#f97316', '#1c1917'],
    colors: {
      logoHeader: '#9a3412',
      navbar: '#ea580c',
      sidebar: '#1c1917',
      pageShell: '#fff7ed',
      accent: '#f97316',
    },
    theme: 'light',
  },
];

export const APPEARANCE_STORAGE_KEY = 'camtraffic_appearance';

const HEX_RE = /^#([0-9A-Fa-f]{6})$/;

export function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  return HEX_RE.test(withHash) ? withHash.toLowerCase() : null;
}

export function isLightColor(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

export function loadAppearance(): AppearanceColors {
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APPEARANCE };
    const parsed = JSON.parse(raw) as Partial<AppearanceColors>;
    return {
      logoHeader: parsed.logoHeader ?? null,
      navbar: parsed.navbar ?? null,
      sidebar: parsed.sidebar ?? null,
      pageShell: parsed.pageShell ?? null,
      accent: parsed.accent ?? null,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(colors: AppearanceColors) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(colors));
}

export function hasCustomAppearance(colors: AppearanceColors): boolean {
  return Object.values(colors).some((v) => v !== null);
}
