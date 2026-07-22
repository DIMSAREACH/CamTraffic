/** Django `datasets.Dataset` row from `/api/datasets/`. */
export interface TrainingDataset {
  id: string;
  name: string;
  slug: string;
  dataset_type?: string;
  description?: string;
  root_path: string;
  image_count: number;
  label_count?: number;
  class_count: number;
  status?: string;
}

export function normalizeDataset(raw: unknown): TrainingDataset | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? '');
  if (!id) return null;
  return {
    id,
    name: String(r.name || r.title || r.slug || `Dataset ${id}`),
    slug: String(r.slug || id),
    dataset_type: r.dataset_type != null ? String(r.dataset_type) : undefined,
    description: r.description != null ? String(r.description) : undefined,
    root_path: String(r.root_path || ''),
    image_count: Number(r.image_count ?? 0) || 0,
    label_count: Number(r.label_count ?? 0) || 0,
    class_count: Number(r.class_count ?? 0) || 0,
    status: r.status != null ? String(r.status) : 'active',
  };
}

/** CLI to train against a synced real dataset folder (run from repo root). */
export function buildTrainCommand(
  ds: TrainingDataset,
  opts: { epochs: number; batchSize: number; imageSize: number; device: string },
): string {
  const root = ds.root_path.replace(/\\/g, '/').replace(/\/?$/, '/');
  const device = opts.device.toLowerCase().includes('cpu') ? 'cpu' : '0';
  if (ds.slug === 'dataset-10' || root.includes('dataset_10')) {
    return `python scripts/train_dataset_10.py --epochs ${opts.epochs} --device ${device}`;
  }
  if (ds.slug === 'dataset' || /ai\/dataset\/?$/.test(root)) {
    return `python ai/train.py --epochs ${opts.epochs} --batch ${opts.batchSize} --device ${device}`;
  }
  const dataYaml = `${root}data.yaml`;
  return `yolo detect train data=${dataYaml} epochs=${opts.epochs} imgsz=${opts.imageSize} batch=${opts.batchSize} device=${device}`;
}
