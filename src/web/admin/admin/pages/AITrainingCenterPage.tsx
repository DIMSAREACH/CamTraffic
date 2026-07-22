import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Brain, CheckCircle2, ClipboardCopy, Database, ExternalLink, FolderOpen,
  PenLine, RefreshCw, ScanText, Sparkles, Terminal,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { datasetsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import {
  buildTrainCommand,
  normalizeDataset,
  type TrainingDataset,
} from '@shared/types/dataset';

interface TrainForm {
  name: string;
  version: string;
  datasetId: string;
  epochs: number;
  imageSize: number;
  batchSize: number;
  learningRate: number;
  gpu: string;
}

const GPUS = ['CPU', 'RTX 4090', 'RTX 3080', 'A100'];

const WORKFLOW = [
  { step: 1, title: 'Sync real dataset', detail: 'Load folders from ai/dataset and ai/dataset_10' },
  { step: 2, title: 'Configure training', detail: 'Set epochs, batch size, and device' },
  { step: 3, title: 'Run YOLO on disk', detail: 'Copy the CLI command and train with real images' },
  { step: 4, title: 'Deploy weights', detail: 'Register best.pt and activate for AI Detection' },
];

export function AITrainingCenterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const [datasets, setDatasets] = useState<TrainingDataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [cliReady, setCliReady] = useState(false);
  const [form, setForm] = useState<TrainForm>({
    name: 'YOLOv8 Cambodian Traffic',
    version: 'v1.0-real',
    datasetId: '',
    epochs: 30,
    imageSize: 640,
    batchSize: 4,
    learningRate: 0.001,
    gpu: GPUS[0],
  });

  const loadDatasets = useCallback(async (withSync = false) => {
    if (user?.role !== 'admin') return;
    setLoadingDatasets(true);
    try {
      if (withSync) {
        setSyncing(true);
        await datasetsAPI.syncFromFilesystem();
      }
      const raw = await datasetsAPI.getAll();
      const list = (Array.isArray(raw) ? raw : [])
        .map(normalizeDataset)
        .filter((d): d is TrainingDataset => d != null)
        .sort((a, b) => b.image_count - a.image_count);
      setDatasets(list);
      setForm((f) => {
        if (f.datasetId && list.some((d) => d.id === f.datasetId)) return f;
        const preferred = list.find((d) => d.slug === 'dataset-10') || list.find((d) => d.image_count > 0) || list[0];
        return preferred ? { ...f, datasetId: preferred.id } : { ...f, datasetId: '' };
      });
    } catch {
      toast.error(tr('aiMlops.datasetsLoadFail', 'Could not load training datasets'));
      setDatasets([]);
    } finally {
      setSyncing(false);
      setLoadingDatasets(false);
    }
  }, [user, t]);

  useEffect(() => { void loadDatasets(true); }, [loadDatasets]);

  const selected = useMemo(
    () => datasets.find((d) => d.id === form.datasetId) ?? null,
    [datasets, form.datasetId],
  );

  const trainCommand = useMemo(() => {
    if (!selected) return '';
    return buildTrainCommand(selected, {
      epochs: form.epochs,
      batchSize: form.batchSize,
      imageSize: form.imageSize,
      device: form.gpu,
    });
  }, [selected, form.epochs, form.batchSize, form.imageSize, form.gpu]);

  const copyCommand = async () => {
    if (!trainCommand) return;
    try {
      await navigator.clipboard.writeText(trainCommand);
      toast.success(tr('aiMlops.cliCopied', 'Train command copied'));
    } catch {
      toast.message(trainCommand);
    }
  };

  const prepareRealTrain = () => {
    if (!form.name.trim() || !form.version.trim()) {
      toast.error(tr('aiMlops.trainValidation', 'Model name and version are required'));
      return;
    }
    if (!selected) {
      toast.error(tr('aiMlops.pickDataset', 'Select a real dataset synced from disk'));
      return;
    }
    if (selected.image_count <= 0) {
      toast.error(tr('aiMlops.datasetEmpty', 'Selected dataset has no images on disk'));
      return;
    }
    setCliReady(true);
    void copyCommand();
    toast.success(tr('aiMlops.realTrainReady', 'Real dataset ready — run the CLI from the repo root'));
  };

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Sparkles size={20} />}
        eyebrow={tr('aiMlops.trainEyebrow', 'Training Center')}
        title={tr('aiMlops.trainTitle', 'Train AI Model')}
        subtitle={tr(
          'aiMlops.trainSubtitleReal',
          'Train YOLO on real CamTraffic datasets from ai/dataset and ai/dataset_10',
        )}
        status={[
          {
            label: tr('aiMlops.datasetsCount', 'Datasets'),
            value: loadingDatasets ? '—' : String(datasets.length),
          },
          {
            label: tr('aiMlops.images', 'Images'),
            value: selected ? selected.image_count.toLocaleString() : '—',
          },
          {
            label: tr('aiMlops.classes', 'Classes'),
            value: selected ? String(selected.class_count) : '—',
          },
        ]}
        actions={(
          <>
            <button
              type="button"
              className="ai-mlops-hero__btn ai-mlops-hero__btn--teal"
              onClick={() => void loadDatasets(true)}
              disabled={syncing || loadingDatasets}
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : undefined} />
              {tr('aiMlops.syncDatasets', 'Sync real data')}
            </button>
            <Link to="/admin/ai-models" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost">
              <Brain size={15} /> {tr('aiMlops.backDashboard', 'Dashboard')}
            </Link>
            <Link to="/admin/ai-models/history" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary">
              {tr('aiMlops.history', 'History')}
            </Link>
          </>
        )}
      />

      <div className="ai-mlops-grid ai-mlops-grid--dash">
        <section className="ai-mlops-panel">
          <header className="ai-mlops-panel__head">
            <div>
              <h2 className="ai-mlops-panel__title">{tr('aiMlops.trainConfig', 'Training configuration')}</h2>
              <p className="ai-mlops-panel__sub">
                {tr('aiMlops.trainConfigSubReal', 'Pick a synced folder of real images/labels, then run YOLO locally')}
              </p>
            </div>
          </header>
          <div className="ai-mlops-panel__body">
            <div className="ai-mlops-form">
              <div className="ai-mlops-field ai-mlops-field--full">
                <label htmlFor="train-name">{tr('aiMlops.modelName', 'Model Name')}</label>
                <input id="train-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-version">{tr('aiMlops.modelVersion', 'Model Version')}</label>
                <input id="train-version" value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-dataset">{tr('aiMlops.dataset', 'Dataset')}</label>
                <select
                  id="train-dataset"
                  value={form.datasetId}
                  disabled={loadingDatasets || datasets.length === 0}
                  onChange={(e) => {
                    setCliReady(false);
                    setForm((f) => ({ ...f, datasetId: e.target.value }));
                  }}
                >
                  {datasets.length === 0 ? (
                    <option value="">{tr('aiMlops.noDatasetsSynced', 'No real datasets — click Sync')}</option>
                  ) : datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.image_count.toLocaleString()} img · {d.class_count} cls
                    </option>
                  ))}
                </select>
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-epochs">{tr('aiMlops.epoch', 'Epoch')}</label>
                <input id="train-epochs" type="number" min={1} value={form.epochs} onChange={(e) => setForm((f) => ({ ...f, epochs: Number(e.target.value) || 1 }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-imgsz">{tr('aiMlops.imageSize', 'Image Size')}</label>
                <input id="train-imgsz" type="number" min={320} step={32} value={form.imageSize} onChange={(e) => setForm((f) => ({ ...f, imageSize: Number(e.target.value) || 640 }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-batch">{tr('aiMlops.batchSize', 'Batch Size')}</label>
                <input id="train-batch" type="number" min={1} value={form.batchSize} onChange={(e) => setForm((f) => ({ ...f, batchSize: Number(e.target.value) || 1 }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-lr">{tr('aiMlops.learningRate', 'Learning Rate')}</label>
                <input id="train-lr" type="number" step="0.0001" value={form.learningRate} onChange={(e) => setForm((f) => ({ ...f, learningRate: Number(e.target.value) || 0.001 }))} />
              </div>
              <div className="ai-mlops-field">
                <label htmlFor="train-gpu">{tr('aiMlops.device', 'Device')}</label>
                <select id="train-gpu" value={form.gpu} onChange={(e) => setForm((f) => ({ ...f, gpu: e.target.value }))}>
                  {GPUS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            {selected ? (
              <div className="ai-mlops-info-grid mt-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.rootPath', 'Root path')}</div>
                  <div className="ai-mlops-info-item__value" style={{ fontSize: '0.8rem' }}>{selected.root_path || '—'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.labels', 'Labels')}</div>
                  <div className="ai-mlops-info-item__value">{(selected.label_count ?? 0).toLocaleString()}</div>
                </div>
              </div>
            ) : null}

            <div className="ai-mlops-complete-actions" style={{ justifyContent: 'flex-start', marginTop: '1rem' }}>
              <button
                type="button"
                className="ai-mlops-hero__btn ai-mlops-hero__btn--primary"
                onClick={prepareRealTrain}
                disabled={loadingDatasets || !selected || selected.image_count <= 0}
              >
                <Terminal size={15} /> {tr('aiMlops.prepareRealTrain', 'Prepare real training')}
              </button>
              <Link to="/admin/ai-models/datasets" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost" style={{ color: 'inherit' }}>
                <Database size={15} /> {tr('aiMlops.datasetsTitle', 'Datasets')}
              </Link>
            </div>
          </div>
        </section>

        <section className="ai-mlops-panel ai-mlops-panel--metrics">
          <header className="ai-mlops-panel__head">
            <div>
              <h2 className="ai-mlops-panel__title">{tr('aiMlops.trainWorkflow', 'Training workflow')}</h2>
              <p className="ai-mlops-panel__sub">{tr('aiMlops.trainWorkflowSub', 'From dataset to production detection')}</p>
            </div>
          </header>
          <div className="ai-mlops-panel__body">
            <ol className="ai-mlops-workflow">
              {WORKFLOW.map((item) => (
                <li key={item.step} className="ai-mlops-workflow__item">
                  <span className="ai-mlops-workflow__step">{item.step}</span>
                  <div>
                    <p className="ai-mlops-workflow__title">{item.title}</p>
                    <p className="ai-mlops-workflow__detail">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {(cliReady || trainCommand) && selected ? (
        <section className="ai-mlops-panel">
          <header className="ai-mlops-panel__head">
            <div className="ai-mlops-panel__head-main">
              <span className="ai-mlops-panel__dot ai-mlops-panel__dot--emerald" aria-hidden />
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.realTrainCli', 'Train with real data (CLI)')}</h2>
                <p className="ai-mlops-panel__sub">
                  {tr(
                    'aiMlops.realTrainCliSub',
                    'Run from the CamTraffic repo root. Uses images/labels already on disk — not demo data.',
                  )}
                </p>
              </div>
            </div>
            {cliReady ? (
              <span className="ai-mlops-badge ai-mlops-badge--active">
                <CheckCircle2 size={12} /> {tr('aiMlops.ready', 'Ready')}
              </span>
            ) : null}
          </header>
          <div className="ai-mlops-panel__body">
            <div className="ai-mlops-cli">
              <code className="ai-mlops-cli__cmd">{trainCommand}</code>
              <button type="button" className="ai-mlops-action ai-mlops-action--deploy" onClick={() => void copyCommand()}>
                <ClipboardCopy size={12} /> {tr('common.copy', 'Copy')}
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-3">
              {tr('aiMlops.realTrainHint', 'After training finishes, register weights under AI Models and deploy for detection.')}
              {' '}
              <Link to="/admin/ai-models/list" className="text-indigo-600 font-semibold">
                {tr('aiMlops.viewModels', 'View models')}
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <div className="ai-mlops-tools">
        <article className="ai-mlops-tool ai-mlops-tool--violet">
          <div className="ai-mlops-tool__icon"><PenLine size={20} /></div>
          <div className="ai-mlops-tool__copy">
            <h3 className="ai-mlops-tool__title">{tr('aiMlops.cvatCardTitle', 'CVAT annotation')}</h3>
            <p className="ai-mlops-tool__text">
              {tr('aiMlops.cvatCardText', 'Label traffic signs, vehicles, and plates in CVAT, then export YOLO packs back into Datasets.')}
            </p>
          </div>
          <div className="ai-mlops-tool__actions">
            <Link to="/admin/ai-models/datasets" className="ai-mlops-action ai-mlops-action--edit">
              <Database size={12} /> {tr('aiMlops.datasetsTitle', 'Datasets')}
            </Link>
            <a
              href="https://app.cvat.ai/projects"
              target="_blank"
              rel="noopener noreferrer"
              className="ai-mlops-action ai-mlops-action--view"
            >
              <ExternalLink size={12} /> {tr('aiMlops.openCvat', 'Open CVAT')}
            </a>
          </div>
        </article>

        <article className="ai-mlops-tool ai-mlops-tool--teal">
          <div className="ai-mlops-tool__icon"><FolderOpen size={20} /></div>
          <div className="ai-mlops-tool__copy">
            <h3 className="ai-mlops-tool__title">{tr('aiMlops.diskDataTitle', 'On-disk real data')}</h3>
            <p className="ai-mlops-tool__text">
              {tr(
                'aiMlops.diskDataText',
                'Primary real training folders: ai/dataset (full classes) and ai/dataset_10 (10-class pilot).',
              )}
            </p>
          </div>
          <div className="ai-mlops-tool__actions">
            <button type="button" className="ai-mlops-action ai-mlops-action--deploy" onClick={() => void loadDatasets(true)}>
              <RefreshCw size={12} /> {tr('aiMlops.syncDatasets', 'Sync real data')}
            </button>
            <Link to="/admin/ai-models/history" className="ai-mlops-action ai-mlops-action--view">
              <ScanText size={12} /> {tr('aiMlops.viewHistory', 'View history')}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
