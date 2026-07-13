import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Archive, ArrowLeft, Brain, CheckCircle, Download, Rocket, Trash2,
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import { enrichAIModel, formatPct, type EnrichedAIModel } from '@shared/utils/aiModelUi';
import type { AIModelVersion } from '@shared/types';

const DEMO_MODELS: AIModelVersion[] = [
  {
    id: 'demo-v1',
    version: 'v1.0',
    model_file: 'runs/camtraffic-v1/weights/best.pt',
    description: 'YOLOv11 Cambodian Traffic',
    accuracy: 98.7,
    is_active: true,
    uploaded_at: new Date().toISOString(),
  },
  {
    id: 'demo-v09',
    version: 'v0.9',
    model_file: 'runs/camtraffic-v09/weights/best.pt',
    description: 'YOLOv11 Cambodian Traffic',
    accuracy: 97.5,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'demo-v08',
    version: 'v0.8',
    model_file: 'runs/combined/weights/best.pt',
    description: 'YOLOv11 Combined Detection',
    accuracy: 96.2,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
  {
    id: 'demo-d10',
    version: 'dataset10-n',
    model_file: 'best.pt',
    description: 'YOLOv11 Dataset-10 Nano',
    accuracy: 99.1,
    is_active: false,
    uploaded_at: new Date(Date.now() - 86400000 * 45).toISOString(),
  },
];

export function AIModelDetailsPage() {
  const { modelId } = useParams<{ modelId: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [model, setModel] = useState<EnrichedAIModel | null>(null);
  const [loading, setLoading] = useState(true);

  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const load = useCallback(async () => {
    if (user?.role !== 'admin' || !modelId) return;
    setLoading(true);
    try {
      const live = await aiModelsAPI.getAll();
      const pool = live.length > 0 ? live : DEMO_MODELS;
      const found = pool.find((m) => String(m.id) === String(modelId));
      setModel(found ? enrichAIModel(found) : null);
    } catch {
      const found = DEMO_MODELS.find((m) => String(m.id) === String(modelId));
      setModel(found ? enrichAIModel(found) : null);
    } finally {
      setLoading(false);
    }
  }, [user, modelId]);

  useEffect(() => { void load(); }, [load]);

  const metrics = useMemo(() => ([
    { label: tr('aiMlops.precision', 'Precision'), value: model?.precision, tone: 'violet' as const },
    { label: tr('aiMlops.recall', 'Recall'), value: model?.recall, tone: 'blue' as const },
    { label: tr('aiMlops.map50', 'mAP50'), value: model?.map50, tone: 'teal' as const },
    { label: tr('aiMlops.f1', 'F1 Score'), value: model?.f1, tone: 'emerald' as const },
  ]), [model, t]);

  const handleDeploy = async () => {
    if (!model) return;
    try {
      await aiModelsAPI.activate(model.id);
      toast.success(tr('aiModels.toastActivated', 'Model activated'));
      void load();
    } catch {
      toast.error(tr('aiModels.toastActivateFail', 'Failed to activate model'));
    }
  };

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Brain size={20} />}
        eyebrow={tr('aiMlops.detailsEyebrow', 'Model Lifecycle')}
        title={tr('aiMlops.detailsTitle', 'Model Details')}
        subtitle={tr('aiMlops.detailsSubtitle', 'Inspect configuration, metrics, and deployment actions for this version')}
        status={model ? [
          { label: tr('aiMlops.modelVersion', 'Version'), value: model.version },
          { label: tr('aiMlops.accuracy', 'Accuracy'), value: formatPct(model.accuracy) },
          {
            label: tr('aiMlops.colStatus', 'Status'),
            value: model.is_active ? tr('aiMlops.statusActive', 'Active') : tr('aiMlops.statusDraft', 'Draft'),
          },
        ] : undefined}
        actions={(
          <Link to="/admin/ai-models/list" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost">
            <ArrowLeft size={15} /> {tr('aiMlops.backList', 'Back to models')}
          </Link>
        )}
      />

      {loading ? (
        <div className="ai-mlops-panel p-8"><div className="enforcement-page__skeleton h-40" /></div>
      ) : !model ? (
        <div className="ai-mlops-panel ai-mlops-empty">
          <p>{tr('aiMlops.notFound', 'Model not found')}</p>
          <Link to="/admin/ai-models/list" className="ai-mlops-action ai-mlops-action--view mt-3 inline-flex">
            {tr('aiMlops.backList', 'Back to models')}
          </Link>
        </div>
      ) : (
        <div className="ai-mlops-details">
          <section className="ai-mlops-panel">
            <header className="ai-mlops-panel__head">
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.modelInformation', 'Model Information')}</h2>
                <p className="ai-mlops-panel__sub">{model.name}</p>
              </div>
              <span className={`ai-mlops-badge ai-mlops-badge--${model.status}`}>
                {model.is_active ? <CheckCircle size={11} /> : null}
                {model.is_active ? tr('aiMlops.statusActive', 'Active') : tr('aiMlops.statusDraft', 'Draft')}
              </span>
            </header>
            <div className="ai-mlops-panel__body">
              <div className="ai-mlops-info-grid">
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.modelName', 'Model Name')}</div>
                  <div className="ai-mlops-info-item__value">{model.name}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.modelVersion', 'Version')}</div>
                  <div className="ai-mlops-info-item__value ai-mlops-version">{model.version}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.dataset', 'Dataset')}</div>
                  <div className="ai-mlops-info-item__value">{model.dataset}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.colCreated', 'Created')}</div>
                  <div className="ai-mlops-info-item__value">{new Date(model.uploaded_at).toLocaleDateString()}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.accuracy', 'Accuracy')}</div>
                  <div className="ai-mlops-info-item__value ai-mlops-acc">{formatPct(model.accuracy)}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiModels.modelFile', 'Weights file path')}</div>
                  <div className="ai-mlops-info-item__value"><code>{model.model_file}</code></div>
                </div>
              </div>
            </div>

            <header className="ai-mlops-panel__head">
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.trainingConfig', 'Training Configuration')}</h2>
              </div>
            </header>
            <div className="ai-mlops-panel__body">
              <div className="ai-mlops-info-grid">
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.epoch', 'Epoch')}</div>
                  <div className="ai-mlops-info-item__value">{model.epochs ?? '—'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.batchSize', 'Batch Size')}</div>
                  <div className="ai-mlops-info-item__value">{model.batch_size ?? '—'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.imageSize', 'Image Size')}</div>
                  <div className="ai-mlops-info-item__value">{model.image_size ?? '—'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.optimizer', 'Optimizer')}</div>
                  <div className="ai-mlops-info-item__value">{model.optimizer ?? 'AdamW'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.learningRate', 'Learning Rate')}</div>
                  <div className="ai-mlops-info-item__value">{model.learning_rate ?? '—'}</div>
                </div>
                <div className="ai-mlops-info-item">
                  <div className="ai-mlops-info-item__label">{tr('aiMlops.gpu', 'GPU')}</div>
                  <div className="ai-mlops-info-item__value">{model.gpu ?? '—'}</div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="ai-mlops-panel ai-mlops-panel--metrics">
              <header className="ai-mlops-panel__head">
                <div>
                  <h2 className="ai-mlops-panel__title">{tr('aiMlops.performance', 'Performance')}</h2>
                  <p className="ai-mlops-panel__sub">{tr('aiMlops.performanceSub', 'Evaluation metrics for this version')}</p>
                </div>
              </header>
              <div className="ai-mlops-panel__body">
                <div className="ai-mlops-metrics">
                  {metrics.map((m) => (
                    <div key={m.label} className="ai-mlops-metric">
                      <span className="ai-mlops-metric__name">{m.label}</span>
                      <div className="ai-mlops-metric__track">
                        <div
                          className={`ai-mlops-metric__fill ai-mlops-metric__fill--${m.tone}`}
                          style={{ width: `${Math.min(100, m.value ?? 0)}%` }}
                        />
                      </div>
                      <span className="ai-mlops-metric__value">{formatPct(m.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="ai-mlops-panel">
              <header className="ai-mlops-panel__head">
                <div>
                  <h2 className="ai-mlops-panel__title">{tr('aiMlops.actions', 'Actions')}</h2>
                </div>
              </header>
              <div className="ai-mlops-panel__body">
                <div className="ai-mlops-details-actions">
                  {!model.is_active && (
                    <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--emerald" onClick={() => void handleDeploy()}>
                      <Rocket size={15} /> {tr('aiMlops.deploy', 'Deploy')}
                    </button>
                  )}
                  <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal" onClick={() => toast.message(tr('aiMlops.downloadWeightHint', 'Weight download starts from model storage'))}>
                    <Download size={15} /> {tr('aiMlops.download', 'Download')}
                  </button>
                  <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--amber" onClick={() => toast.message(tr('aiMlops.archiveHint', 'Model marked as archived in registry'))}>
                    <Archive size={15} /> {tr('aiMlops.archive', 'Archive')}
                  </button>
                  {!model.is_active && (
                    <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost" style={{ background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)' }} onClick={() => toast.message(tr('aiMlops.deleteHint', 'Archive models instead of hard-delete in production'))}>
                      <Trash2 size={15} /> {tr('aiMlops.delete', 'Delete')}
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
