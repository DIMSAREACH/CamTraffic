import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle, History, Rocket, RotateCcw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import { enrichAIModels, formatPct, type EnrichedAIModel } from '@shared/utils/aiModelUi';
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
];

export function AIDeploymentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [models, setModels] = useState<EnrichedAIModel[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const load = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const live = await aiModelsAPI.getAll();
      setModels(enrichAIModels(live.length > 0 ? live : DEMO_MODELS));
    } catch {
      setModels(enrichAIModels(DEMO_MODELS));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const handleActivate = async (id: string) => {
    try {
      await aiModelsAPI.activate(id);
      toast.success(tr('aiModels.toastActivated', 'Model activated'));
      void load();
    } catch {
      toast.error(tr('aiModels.toastActivateFail', 'Failed to activate model'));
    }
  };

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  const active = models.find((m) => m.is_active);

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Rocket size={20} />}
        eyebrow={tr('aiMlops.deployEyebrow', 'Deployment Center')}
        title={tr('aiMlops.deployTitle', 'Deployments')}
        subtitle={tr('aiMlops.deploySubtitle', 'Activate or roll back model versions used by AI Detection')}
        status={[
          {
            label: tr('aiMlops.productionModel', 'Production model'),
            value: active?.version ?? tr('aiMlops.statusDraft', 'Draft'),
          },
          {
            label: tr('aiMlops.accuracy', 'Accuracy'),
            value: active ? formatPct(active.accuracy) : '—',
          },
          {
            label: tr('aiTraining.versions', 'Versions'),
            value: loading ? '—' : String(models.length),
          },
        ]}
        actions={(
          <Link to="/admin/ai-models/history" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost">
            <History size={15} /> {tr('aiMlops.history', 'History')}
          </Link>
        )}
      />

      {active ? (
        <div className="ai-mlops-panel ai-mlops-panel--metrics">
          <div className="ai-mlops-panel__body !pt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-600">{tr('aiMlops.productionModel', 'Production model')}</p>
              <h2 className="text-xl font-bold mt-1">{active.name} · {active.version}</h2>
              <p className="text-sm text-slate-500 mt-1">{formatPct(active.accuracy)} · {active.dataset}</p>
            </div>
            <span className="ai-mlops-badge ai-mlops-badge--active">
              <CheckCircle size={12} /> {tr('aiMlops.statusActive', 'Active')}
            </span>
          </div>
        </div>
      ) : null}

      <section className="ai-mlops-panel">
        <header className="ai-mlops-panel__head">
          <div>
            <h2 className="ai-mlops-panel__title">{tr('aiMlops.availableVersions', 'Available versions')}</h2>
            <p className="ai-mlops-panel__sub">{tr('aiMlops.availableVersionsSub', 'Promote a version to production or keep current deployment')}</p>
          </div>
        </header>
        <div className="ai-mlops-panel__body overflow-x-auto">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[tr('aiMlops.colModel', 'Model'), tr('aiMlops.colVersion', 'Version'), tr('aiMlops.colAccuracy', 'Accuracy'), tr('aiMlops.colStatus', 'Status'), tr('aiMlops.colAction', 'Action')].map((h) => (
                  <TableHead key={h} className="enforcement-page__th">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((__, j) => <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>)}
                  </TableRow>
                ))
              ) : models.length === 0 ? (
                <TableEmptyState colSpan={5} tone="violet" icon={<Rocket size={28} />} title={tr('aiModels.empty', 'No AI models registered')} />
              ) : models.map((m) => (
                <TableRow key={m.id} className="enforcement-page__table-row">
                  <TableCell><span className="ai-mlops-name">{m.name}</span></TableCell>
                  <TableCell><span className="ai-mlops-version">{m.version}</span></TableCell>
                  <TableCell><span className="ai-mlops-acc">{formatPct(m.accuracy)}</span></TableCell>
                  <TableCell>
                    <span className={`ai-mlops-badge ai-mlops-badge--${m.is_active ? 'active' : 'draft'}`}>
                      {m.is_active ? tr('aiMlops.statusActive', 'Active') : tr('aiMlops.statusDraft', 'Draft')}
                    </span>
                  </TableCell>
                  <TableCell>
                    {m.is_active ? (
                      <span className="text-xs text-slate-500">{tr('aiMlops.inProduction', 'In production')}</span>
                    ) : (
                      <button type="button" className="ai-mlops-action ai-mlops-action--deploy" onClick={() => void handleActivate(m.id)}>
                        <RotateCcw size={12} /> {tr('aiMlops.rollbackOrDeploy', 'Deploy / Roll back')}
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
