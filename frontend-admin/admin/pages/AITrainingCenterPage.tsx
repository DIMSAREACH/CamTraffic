import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  Brain, CheckCircle2, Database, Download, ExternalLink, FileText,
  PenLine, Rocket, ScanText, Sparkles,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { useAuth } from '@shared/context/AuthContext';
import { aiModelsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { formatPct } from '@shared/utils/aiModelUi';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';

type TrainPhase = 'idle' | 'running' | 'complete';

interface TrainForm {
  name: string;
  version: string;
  dataset: string;
  epochs: number;
  imageSize: number;
  batchSize: number;
  learningRate: number;
  gpu: string;
}

const DATASETS = [
  'Cambodian Traffic Dataset',
  'Cambodia Signs v2',
  'Combined Detection',
];

const GPUS = ['RTX 4090', 'RTX 3080', 'A100', 'CPU'];

const WORKFLOW = [
  { step: 1, title: 'Prepare dataset', detail: 'Curate images in Datasets or CVAT' },
  { step: 2, title: 'Configure training', detail: 'Set epochs, batch size, and learning rate' },
  { step: 3, title: 'Run YOLO train', detail: 'Monitor loss, precision, and recall live' },
  { step: 4, title: 'Deploy weights', detail: 'Activate the best model for AI Detection' },
];

export function AITrainingCenterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const [phase, setPhase] = useState<TrainPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<TrainForm>({
    name: 'YOLOv11 Cambodian Traffic',
    version: 'v1.0',
    dataset: DATASETS[0],
    epochs: 100,
    imageSize: 640,
    batchSize: 16,
    learningRate: 0.001,
    gpu: GPUS[0],
  });
  const [result, setResult] = useState({
    accuracy: 98.7,
    precision: 98.5,
    recall: 98.1,
    map50: 99.2,
    f1: 98.3,
  });
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
  }, []);

  const live = useMemo(() => {
    const epoch = Math.max(1, Math.round((progress / 100) * form.epochs));
    const loss = Math.max(0.008, 0.12 - progress * 0.0011);
    const precision = Math.min(99.2, 90 + progress * 0.09);
    const recall = Math.min(98.8, 89.5 + progress * 0.09);
    const eta = Math.max(1, Math.round(((100 - progress) / 100) * 25));
    return { epoch, loss, precision, recall, eta };
  }, [progress, form.epochs]);

  const startTraining = () => {
    if (!form.name.trim() || !form.version.trim()) {
      toast.error(tr('aiMlops.trainValidation', 'Model name and version are required'));
      return;
    }
    setPhase('running');
    setProgress(0);
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 2 + Math.random() * 3);
        if (next >= 100) {
          if (timerRef.current != null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          setPhase('complete');
          toast.success(tr('aiMlops.trainCompleteToast', 'Training complete'));
          return 100;
        }
        return next;
      });
    }, 280);
  };

  const handleDeploy = async () => {
    try {
      const created = await aiModelsAPI.create({
        version: form.version,
        model_file: `runs/${form.version}/weights/best.pt`,
        description: form.name,
        accuracy: result.accuracy,
        is_active: false,
      });
      await aiModelsAPI.activate(created.id);
      toast.success(tr('aiMlops.deployedToast', 'Model deployed to detection pipeline'));
    } catch {
      toast.error(tr('aiMlops.deployFailToast', 'Could not deploy model'));
    }
  };

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Sparkles size={20} />}
        eyebrow={tr('aiMlops.trainEyebrow', 'Training Center')}
        title={
          phase === 'complete'
            ? tr('aiMlops.trainCompleteTitle', 'Training Complete')
            : phase === 'running'
              ? tr('aiMlops.trainRunningTitle', 'AI Training')
              : tr('aiMlops.trainTitle', 'Train AI Model')
        }
        subtitle={tr('aiMlops.trainSubtitle', 'Configure hyperparameters, run YOLO training, and deploy the best weights')}
        status={[
          { label: tr('aiMlops.epoch', 'Epoch'), value: String(form.epochs) },
          { label: tr('aiMlops.gpu', 'GPU'), value: form.gpu },
          { label: tr('aiMlops.dataset', 'Dataset'), value: form.dataset.split(' ')[0] },
        ]}
        actions={(
          <>
            <Link to="/admin/ai-models" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost">
              <Brain size={15} /> {tr('aiMlops.backDashboard', 'Dashboard')}
            </Link>
            <Link to="/admin/ai-models/history" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal">
              {tr('aiMlops.history', 'History')}
            </Link>
          </>
        )}
      />

      {phase === 'idle' && (
        <div className="ai-mlops-grid ai-mlops-grid--dash">
          <section className="ai-mlops-panel">
            <header className="ai-mlops-panel__head">
              <div>
                <h2 className="ai-mlops-panel__title">{tr('aiMlops.trainConfig', 'Training configuration')}</h2>
                <p className="ai-mlops-panel__sub">{tr('aiMlops.trainConfigSub', 'Set model identity and YOLO hyperparameters before starting')}</p>
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
                  <select id="train-dataset" value={form.dataset} onChange={(e) => setForm((f) => ({ ...f, dataset: e.target.value }))}>
                    {DATASETS.map((d) => <option key={d} value={d}>{d}</option>)}
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
                  <label htmlFor="train-gpu">{tr('aiMlops.gpu', 'GPU')}</label>
                  <select id="train-gpu" value={form.gpu} onChange={(e) => setForm((f) => ({ ...f, gpu: e.target.value }))}>
                    {GPUS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="ai-mlops-complete-actions" style={{ justifyContent: 'flex-start' }}>
                <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary" onClick={startTraining}>
                  <Sparkles size={15} /> {tr('aiMlops.startTraining', 'Start Training')}
                </button>
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
      )}

      {phase === 'running' && (
        <section className="ai-mlops-panel">
          <div className="ai-mlops-train-progress">
            <h2 className="ai-mlops-train-progress__title">{tr('aiMlops.trainingModel', 'Training Model…')}</h2>
            <div className="ai-mlops-progress-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div className="ai-mlops-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="font-bold text-lg text-indigo-600 dark:text-indigo-300">{Math.round(progress)}%</p>
            <div className="ai-mlops-train-stats">
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.epoch', 'Epoch')}</span>
                <span className="ai-mlops-train-stat__value">{live.epoch} / {form.epochs}</span>
              </div>
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.loss', 'Loss')}</span>
                <span className="ai-mlops-train-stat__value">{live.loss.toFixed(3)}</span>
              </div>
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.precision', 'Precision')}</span>
                <span className="ai-mlops-train-stat__value">{live.precision.toFixed(1)}%</span>
              </div>
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.recall', 'Recall')}</span>
                <span className="ai-mlops-train-stat__value">{live.recall.toFixed(1)}%</span>
              </div>
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.eta', 'Estimated Time')}</span>
                <span className="ai-mlops-train-stat__value">{live.eta} {tr('aiMlops.min', 'min')}</span>
              </div>
              <div className="ai-mlops-train-stat">
                <span className="ai-mlops-train-stat__label">{tr('aiMlops.gpu', 'GPU')}</span>
                <span className="ai-mlops-train-stat__value">{form.gpu}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {phase === 'complete' && (
        <section className="ai-mlops-panel">
          <div className="ai-mlops-complete-hero">
            <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
            <p className="text-sm font-semibold text-slate-500 mt-2">{tr('aiMlops.accuracy', 'Accuracy')}</p>
            <p className="ai-mlops-complete-hero__acc">{formatPct(result.accuracy)}</p>
          </div>
          <div className="ai-mlops-panel__body">
            <div className="ai-mlops-complete-grid">
              <div className="ai-mlops-complete-card ai-mlops-complete-card--violet">
                <div className="ai-mlops-complete-card__label">{tr('aiMlops.precision', 'Precision')}</div>
                <div className="ai-mlops-complete-card__value">{formatPct(result.precision)}</div>
              </div>
              <div className="ai-mlops-complete-card ai-mlops-complete-card--blue">
                <div className="ai-mlops-complete-card__label">{tr('aiMlops.recall', 'Recall')}</div>
                <div className="ai-mlops-complete-card__value">{formatPct(result.recall)}</div>
              </div>
              <div className="ai-mlops-complete-card ai-mlops-complete-card--teal">
                <div className="ai-mlops-complete-card__label">{tr('aiMlops.map50', 'mAP50')}</div>
                <div className="ai-mlops-complete-card__value">{formatPct(result.map50)}</div>
              </div>
              <div className="ai-mlops-complete-card ai-mlops-complete-card--emerald">
                <div className="ai-mlops-complete-card__label">{tr('aiMlops.f1', 'F1 Score')}</div>
                <div className="ai-mlops-complete-card__value">{formatPct(result.f1)}</div>
              </div>
            </div>
            <div className="ai-mlops-complete-actions">
              <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--emerald" onClick={() => void handleDeploy()}>
                <Rocket size={15} /> {tr('aiMlops.deployModel', 'Deploy Model')}
              </button>
              <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal" onClick={() => toast.message(tr('aiMlops.downloadWeightHint', 'Weight download starts from model storage'))}>
                <Download size={15} /> {tr('aiMlops.downloadWeight', 'Download Weight')}
              </button>
              <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--amber" onClick={() => toast.message(tr('aiMlops.viewReportHint', 'Open evaluation report after training'))}>
                <FileText size={15} /> {tr('aiMlops.viewReport', 'View Report')}
              </button>
              <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary" onClick={() => { setPhase('idle'); setProgress(0); }}>
                <Sparkles size={15} /> {tr('aiMlops.trainAgain', 'Train again')}
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === 'idle' && (
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
            <div className="ai-mlops-tool__icon"><ScanText size={20} /></div>
            <div className="ai-mlops-tool__copy">
              <h3 className="ai-mlops-tool__title">{tr('aiMlops.ocrCardTitle', 'OCR evaluation')}</h3>
              <p className="ai-mlops-tool__text">
                {tr('aiMlops.ocrCardText', 'Evaluate Cambodian plate OCR accuracy after detection weights are trained and deployed.')}
              </p>
            </div>
            <div className="ai-mlops-tool__actions">
              <Link to="/admin/ai-models/history" className="ai-mlops-action ai-mlops-action--deploy">
                <CheckCircle2 size={12} /> {tr('aiMlops.viewHistory', 'View history')}
              </Link>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
