import type { AIModelVersion } from '@shared/types';

export type ModelUiStatus = 'active' | 'training' | 'archive' | 'draft';

/** Matches Drivers / Vehicles status badge styling. */
export const MODEL_STATUS_META: Record<ModelUiStatus, { bg: string; color: string }> = {
  active: { bg: 'rgba(16,185,129,0.1)', color: '#059669' },
  archive: { bg: 'rgba(100,116,139,0.12)', color: '#64748B' },
  draft: { bg: 'rgba(59,130,246,0.12)', color: '#2563EB' },
  training: { bg: 'rgba(245,158,11,0.12)', color: '#D97706' },
};

export function modelStatusLabel(
  status: ModelUiStatus,
  tr: (key: string, fallback: string) => string,
): string {
  if (status === 'active') return tr('aiMlops.statusActive', 'Active');
  if (status === 'archive') return tr('aiMlops.statusArchive', 'Archive');
  if (status === 'training') return tr('aiMlops.statusTraining', 'Training');
  return tr('aiMlops.statusDraft', 'Draft');
}

/** Short label for table cells; full description stays available via title/tooltip. */
export function shortModelName(model: Pick<AIModelVersion, 'description' | 'version'>): string {
  const desc = model.description?.trim();
  if (!desc) return `YOLOv11 ${model.version}`;
  const primary = desc.split('(')[0].trim();
  if (primary.length <= 42) return primary;
  return `${primary.slice(0, 39).trimEnd()}…`;
}

export interface EnrichedAIModel extends AIModelVersion {
  name: string;
  dataset: string;
  status: ModelUiStatus;
  epochs?: number;
  batch_size?: number;
  image_size?: number;
  learning_rate?: number;
  optimizer?: string;
  precision?: number | null;
  recall?: number | null;
  map50?: number | null;
  f1?: number | null;
  gpu?: string;
}

/** Django DecimalField arrives as a JSON string; coerce for chart/math use. */
function toNumber(value: unknown, fallback: number | null = null): number | null {
  if (value == null || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Production enrichment: only real API fields.
 * Do not fabricate precision/recall/mAP/F1/dataset/hyperparams.
 */
export function enrichAIModel(model: AIModelVersion, _index = 0): EnrichedAIModel {
  const accuracy = toNumber(model.accuracy, null);
  return {
    ...model,
    accuracy,
    name: shortModelName(model),
    dataset: model.description?.trim() || '—',
    status: model.is_active ? 'active' : 'draft',
    precision: null,
    recall: null,
    map50: accuracy,
    f1: null,
  };
}

export function enrichAIModels(models: AIModelVersion[]): EnrichedAIModel[] {
  return models.map((m, i) => enrichAIModel(m, i));
}

/** Accuracy trend from real model rows only (no synthetic filler points). */
export function buildAccuracyTrend(models: EnrichedAIModel[]): { label: string; value: number }[] {
  if (models.length === 0) return [];
  return [...models]
    .sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime())
    .slice(-6)
    .map((m) => ({
      label: m.version.length > 10 ? m.version.slice(0, 10) : m.version,
      value: Number((toNumber(m.accuracy, 0) ?? 0).toFixed(1)),
    }))
    .filter((p) => p.value > 0);
}

export function formatPct(value: number | string | null | undefined, digits = 2): string {
  const n = toNumber(value, null);
  if (n == null) return '—';
  return `${n.toFixed(digits)}%`;
}
