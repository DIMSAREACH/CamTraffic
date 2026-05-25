import type { CSSProperties } from 'react';

/**
 * CamTraffic dashboard chart palette — muted indigo/slate, cohesive & readable.
 */
export const CHART = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#A5B4FC',
  secondary: '#0D9488',
  secondaryLight: '#2DD4BF',
  neutral: '#64748B',
  neutralLight: '#94A3B8',
  grid: '#E2E8F0',
  axis: '#94A3B8',
  axisLabel: '#64748B',
} as const;

/** Categorical series (pie, multi-bar) */
export const CHART_SERIES = [
  CHART.primary,
  CHART.secondary,
  CHART.neutral,
  '#818CF8',
  '#38BDF8',
  '#CBD5E1',
] as const;

/** User role donut — distinct but harmonious */
export const CHART_ROLE_COLORS = [
  CHART.primary,
  CHART.secondary,
  CHART.neutralLight,
] as const;

export const chartTooltipStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#FFFFFF',
  fontSize: 12,
  color: '#334155',
  boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)',
  padding: '8px 12px',
};

export const chartAxisTick = { fontSize: 11, fill: CHART.axis };
export const chartCategoryTick = { fontSize: 10, fill: CHART.axisLabel };
