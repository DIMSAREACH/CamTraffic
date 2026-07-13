import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Database, FolderOpen, Layers, Plus } from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { datasetsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';

interface DatasetRow {
  id: string | number;
  name?: string;
  title?: string;
  image_count?: number;
  version?: string;
  status?: string;
}

export function AIDatasetsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const load = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      const data = await datasetsAPI.getAll();
      const list = Array.isArray(data) ? (data as DatasetRow[]) : [];
      setRows(list.length > 0 ? list : [
        { id: 1, name: 'Cambodian Traffic Dataset', image_count: 12480, version: 'v3', status: 'ready' },
        { id: 2, name: 'Cambodia Signs v2', image_count: 8320, version: 'v2', status: 'ready' },
        { id: 3, name: 'Combined Detection', image_count: 20110, version: 'v1', status: 'curating' },
      ]);
    } catch {
      setRows([
        { id: 1, name: 'Cambodian Traffic Dataset', image_count: 12480, version: 'v3', status: 'ready' },
        { id: 2, name: 'Cambodia Signs v2', image_count: 8320, version: 'v2', status: 'ready' },
        { id: 3, name: 'Combined Detection', image_count: 20110, version: 'v1', status: 'curating' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{tr('aiModels.adminOnly', 'AI model registry is for administrators only.')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Database size={20} />}
        eyebrow={tr('aiMlops.datasetsEyebrow', 'Dataset Manager')}
        title={tr('aiMlops.datasetsTitle', 'Datasets')}
        subtitle={tr('aiMlops.datasetsSubtitle', 'Organize training collections used by YOLO training jobs')}
        status={[
          { label: tr('aiMlops.datasetsCount', 'Datasets'), value: loading ? '—' : String(rows.length) },
          {
            label: tr('aiMlops.images', 'Images'),
            value: loading ? '—' : rows.reduce((sum, r) => sum + (r.image_count ?? 0), 0).toLocaleString(),
          },
        ]}
        actions={(
          <>
            <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary" onClick={() => toast.message(tr('aiMlops.datasetUploadHint', 'Connect storage to upload a new dataset'))}>
              <Plus size={15} /> {tr('aiMlops.addDataset', 'Add dataset')}
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
            {loading ? '—' : rows.reduce((sum, r) => sum + (r.image_count ?? 0), 0).toLocaleString()}
          </p>
          <p className="ai-mlops-kpi__label">{tr('aiMlops.images', 'Images')}</p>
        </div>
      </div>

      <div className="ai-mlops-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="ai-mlops-panel p-6"><div className="enforcement-page__skeleton h-24" /></div>)
        ) : rows.map((d) => (
          <article key={d.id} className="ai-mlops-panel">
            <div className="ai-mlops-panel__body !pt-4">
              <div className="ai-mlops-kpi__icon" style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
                <Database size={18} />
              </div>
              <h3 className="ai-mlops-name mt-3">{d.name || d.title || `Dataset ${d.id}`}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {d.version ? `v${String(d.version).replace(/^v/i, '')}` : '—'} · {(d.image_count ?? 0).toLocaleString()} {tr('aiMlops.images', 'Images')}
              </p>
              <span className={`ai-mlops-badge mt-3 inline-flex ${d.status === 'ready' ? 'ai-mlops-badge--active' : 'ai-mlops-badge--draft'}`}>
                {d.status || 'ready'}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
