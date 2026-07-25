import type { CSSProperties } from 'react';

/** Full-spectrum rainbow palette — red through violet. */
export const RAINBOW_SERIES = [
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#84CC16',
  '#22C55E',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#A855F7',
  '#EC4899',
] as const;

const RAINBOW_DARK = [
  '#DC2626',
  '#EA580C',
  '#EAB308',
  '#65A30D',
  '#16A34A',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#DB2777',
] as const;

/** Rainbow dashboard spectrum — used across all charts. */
export const DASHBOARD_PALETTE = RAINBOW_SERIES.map((solid, index) => ({
  name: ['red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'indigo', 'violet', 'pink'][index],
  solid,
  dark: RAINBOW_DARK[index],
  soft: `${solid}24`,
  grad: `linear-gradient(135deg, ${solid} 0%, ${RAINBOW_DARK[index]} 100%)`,
})) as readonly {
  name: string;
  solid: string;
  dark: string;
  soft: string;
  grad: string;
}[];

export const CHART = {
  primary: RAINBOW_SERIES[6],
  primaryDark: RAINBOW_DARK[6],
  primaryLight: '#93C5FD',
  secondary: RAINBOW_SERIES[4],
  secondaryLight: '#86EFAC',
  neutral: '#64748B',
  neutralLight: '#94A3B8',
  grid: '#E2E8F0',
  axis: '#94A3B8',
  axisLabel: '#64748B',
} as const;

/** Rainbow colors for pie, bar segments, and series */
export const CHART_SERIES = [...RAINBOW_SERIES];

/** User role donut — spread across the rainbow */
export const CHART_ROLE_COLORS = [
  RAINBOW_SERIES[8],
  RAINBOW_SERIES[6],
  RAINBOW_SERIES[4],
] as const;

/** Horizontal rainbow gradient stops for area / line charts */
export const RAINBOW_GRADIENT_STOPS = RAINBOW_SERIES.map((color, index) => ({
  offset: `${Math.round((index / (RAINBOW_SERIES.length - 1)) * 100)}%`,
  color,
}));

export const chartTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  fontSize: 12,
  color: '#334155',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
  padding: '8px 12px',
};

export const chartAxisTick = { fontSize: 11, fill: CHART.axis };
export const chartCategoryTick = { fontSize: 10, fill: CHART.axisLabel };

export function dashboardColor(index: number) {
  return DASHBOARD_PALETTE[index % DASHBOARD_PALETTE.length];
}

export function chartSeriesColor(index: number): string {
  return CHART_SERIES[index % CHART_SERIES.length];
}
