import type { AIModelVersion } from '@shared/types';

export type ModelUiStatus = 'active' | 'training' | 'archive' | 'draft';

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

/** Demo lifecycle extras when API only returns core model fields. */
export function enrichAIModel(model: AIModelVersion, index = 0): EnrichedAIModel {
  const seed = Math.abs(hashString(model.id || model.version)) + index;
  const accuracy = model.accuracy ?? (95 + (seed % 40) / 10);
  const precision = Math.min(99.9, accuracy + ((seed % 5) - 2) / 10);
  const recall = Math.min(99.9, accuracy + ((seed % 7) - 3) / 10);
  const map50 = Math.min(99.9, accuracy + 0.4 + (seed % 3) / 10);
  const f1 = Math.min(99.9, (precision + recall) / 2);

  return {
    ...model,
    accuracy,
    name: model.description?.trim() || `YOLOv11 ${model.version}`,
    dataset: seed % 3 === 0 ? 'Cambodian Traffic Dataset' : seed % 3 === 1 ? 'Cambodia Signs v2' : 'Combined Detection',
    status: model.is_active ? 'active' : seed % 5 === 0 ? 'archive' : 'draft',
    epochs: 50 + (seed % 6) * 25,
    batch_size: [8, 16, 32][seed % 3],
    image_size: [640, 640, 1280][seed % 3],
    learning_rate: [0.001, 0.0005, 0.01][seed % 3],
    optimizer: seed % 2 === 0 ? 'AdamW' : 'SGD',
    precision: Number(precision.toFixed(2)),
    recall: Number(recall.toFixed(2)),
    map50: Number(map50.toFixed(2)),
    f1: Number(f1.toFixed(2)),
    gpu: ['RTX 4090', 'RTX 3080', 'A100'][seed % 3],
  };
}

export function enrichAIModels(models: AIModelVersion[]): EnrichedAIModel[] {
  return models.map((m, i) => enrichAIModel(m, i));
}

/** Synthetic accuracy trend points for dashboard charts. */
export function buildAccuracyTrend(models: EnrichedAIModel[]): { label: string; value: number }[] {
  if (models.length === 0) {
    return [
      { label: 'v0.6', value: 92.1 },
      { label: 'v0.7', value: 94.4 },
      { label: 'v0.8', value: 96.2 },
      { label: 'v0.9', value: 97.5 },
      { label: 'v1.0', value: 98.7 },
    ];
  }
  return [...models]
    .sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime())
    .slice(-6)
    .map((m) => ({
      label: m.version.length > 10 ? m.version.slice(0, 10) : m.version,
      value: Number((m.accuracy ?? 0).toFixed(1)),
    }));
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(digits)}%`;
}

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}
