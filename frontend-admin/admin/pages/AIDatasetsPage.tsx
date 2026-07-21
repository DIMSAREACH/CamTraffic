import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Database, FolderOpen, Layers, RefreshCw } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { datasetsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import { normalizeDataset, type TrainingDataset } from '@shared/types/dataset';

export function AIDatasetsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<TrainingDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const load = useCallback(async (withSync = false) => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      if (withSync) {
        setSyncing(true);
        await datasetsAPI.syncFromFilesystem();
        toast.success(tr('aiMlops.datasetsSynced', 'Synced real datasets from disk'));
      }
      const data = await datasetsAPI.getAll();
      const list = (Array.isArray(data) ? data : [])
        .map(normalizeDataset)
        .filter((d): d is TrainingDataset => d != null)
        .sort((a, b) => b.image_count - a.image_count);
      setRows(list);
    } catch {
      toast.error(tr('aiMlops.datasetsLoadFail', 'Could not load training datasets'));
      setRows([]);
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => { void load(true); }, [load]);

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  const totalImages = rows.reduce((sum, r) => sum + r.image_count, 0);

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Database size={20} />}
        eyebrow={tr('aiMlops.datasetsEyebrow', 'Dataset Manager')}
        title={tr('aiMlops.datasetsTitle', 'Datasets')}
        subtitle={tr(
          'aiMlops.datasetsSubtitleReal',
          'Real training collections synced from ai/dataset and ai/dataset_10',
        )}
        status={[
          { label: tr('aiMlops.datasetsCount', 'Datasets'), value: loading ? '—' : String(rows.length) },
          {
            label: tr('aiMlops.images', 'Images'),
            value: loading ? '—' : totalImages.toLocaleString(),
          },
        ]}
        actions={(
          <>
            <button
              type="button"
              className="ai-mlops-hero__btn ai-mlops-hero__btn--primary"
              onClick={() => void load(true)}
              disabled={syncing || loading}
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : undefined} />
              {tr('aiMlops.syncDatasets', 'Sync real data')}
            </button>
            <Link to="/admin/ai-models/train" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal">
              <Layers size={15} /> {tr('aiMlops.trainModel', 'Train Model')}
            </Link>
          </>
        )}
      />

      <div className="ai-mlops-kpis">
        <div className="ai-mlops-kpi ai-mlops-kpi--violet">
          <div className="ai-mlops-kpi__icon"><Database size={18} /></div>
          <p className="ai-mlops-kpi__value">{loading ? '—' : rows.length}</p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.datasetsCount', 'Datasets')}</p>
        </div>
        <div className="ai-mlops-kpi ai-mlops-kpi--blue">
          <div className="ai-mlops-kpi__icon"><FolderOpen size={18} /></div>
          <p className="ai-mlops-kpi__value">
            {loading ? '—' : totalImages.toLocaleString()}
          </p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.images', 'Images')}</p>
        </div>
      </div>

      <div className="ai-mlops-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="ai-mlops-panel p-6">
              <div className="enforcement-page__skeleton h-24" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="ai-mlops-panel ai-mlops-panel--empty" style={{ gridColumn: '1 / -1' }}>
            <div className="ai-mlops-panel__body">
              <p className="ai-mlops-panel__title">{tr('aiMlops.noRealDatasets', 'No real datasets registered')}</p>
              <p className="ai-mlops-panel__sub mt-2">
                {tr(
                  'aiMlops.noRealDatasetsHint',
                  'Ensure ai/dataset or ai/dataset_10 exist on the server, then click Sync real data.',
                )}
              </p>
              <button
                type="button"
                className="ai-mlops-hero__btn ai-mlops-hero__btn--primary mt-4"
                onClick={() => void load(true)}
                disabled={syncing}
              >
                <RefreshCw size={15} /> {tr('aiMlops.syncDatasets', 'Sync real data')}
              </button>
            </div>
          </div>
        ) : rows.map((d) => (
          <article key={d.id} className="ai-mlops-panel">
            <div className="ai-mlops-panel__body !pt-4">
              <div className="ai-mlops-kpi__icon" style={{ background: 'rgba(13,148,136,0.12)', color: '#0f766e' }}>
                <Database size={18} />
              </div>
              <h3 className="ai-mlops-name mt-3">{d.name}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {d.class_count} {tr('aiMlops.classes', 'Classes')} · {d.image_count.toLocaleString()}{' '}
                {tr('aiMlops.images', 'Images')}
              </p>
              {d.root_path ? (
                <p className="text-xs text-slate-400 mt-2 break-all" title={d.root_path}>
                  {d.root_path}
                </p>
              ) : null}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`ai-mlops-badge inline-flex ${d.image_count > 0 ? 'ai-mlops-badge--active' : 'ai-mlops-badge--draft'}`}>
                  {d.image_count > 0 ? tr('aiMlops.ready', 'Ready') : (d.status || 'empty')}
                </span>
                <Link to="/admin/ai-models/train" className="ai-mlops-action ai-mlops-action--deploy">
                  <Layers size={12} /> {tr('aiMlops.trainModel', 'Train')}
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
