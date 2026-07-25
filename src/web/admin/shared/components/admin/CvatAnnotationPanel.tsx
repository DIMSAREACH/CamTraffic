import { useCallback, useEffect, useState } from 'react';
import {
  ExternalLink, FolderOpen, Layers, RefreshCw, Upload, PenLine,
  CheckCircle2, Clock, Search, Sparkles, FileBox, ImageIcon,
} from 'lucide-react';
import { useLanguage } from '@shared/context/LanguageContext';
import { cvatAPI } from '@shared/services/api';
import { cn } from '@shared/components/ui/utils';
import { toast } from 'sonner';

type CvatBatch = {
  id: string;
  name: string;
  images: number;
  source: string;
  status: string;
  cvat_pack?: string | null;
  exported_images?: number;
};

type CvatHub = {
  workflow: {
    cvat_url: string;
    steps: Array<{ step: number; title: string; detail: string }>;
    protocol_path: string;
  };
  labels: { label_count: number; path: string };
  batches: CvatBatch[];
  combined_model_classes: number;
  recent_exports?: Array<Record<string, string>>;
};

const CVAT_EMBED_URL = 'https://app.cvat.ai/projects';

const STEP_TONES = ['violet', 'blue', 'cyan', 'amber', 'rose', 'emerald'] as const;

const STATUS_META: Record<string, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  qa: { icon: CheckCircle2, tone: 'emerald', label: 'QA' },
  spot_check: { icon: Search, tone: 'amber', label: 'Spot check' },
  pending: { icon: Clock, tone: 'blue', label: 'Pending' },
  refine: { icon: Sparkles, tone: 'violet', label: 'Refine' },
};

function statusMeta(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_META[key] ?? { icon: FileBox, tone: 'slate', label: status };
}

export function CvatAnnotationPanel() {
  const { t } = useLanguage();
  const tr = (key: string, fb: string) => {
    const v = t(key);
    return v !== key ? v : fb;
  };

  const [hub, setHub] = useState<CvatHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [staging, setStaging] = useState(false);
  const [embedBlocked, setEmbedBlocked] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setHub(await cvatAPI.getHub() as CvatHub);
    } catch {
      toast.error(tr('cvat.loadFailed', 'Failed to load CVAT hub'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const handleStagePack = async () => {
    setStaging(true);
    try {
      const res = await cvatAPI.stagePack() as { ok?: boolean; pack_path?: string };
      if (res?.ok) {
        toast.success(tr('cvat.staged', 'Vehicle CVAT pack staged'));
        void load();
      } else {
        toast.error(tr('cvat.stageFailed', 'Staging failed'));
      }
    } catch {
      toast.error(tr('cvat.stageFailed', 'Staging failed'));
    } finally {
      setStaging(false);
    }
  };

  const openCvat = () => {
    window.open(hub?.workflow?.cvat_url || CVAT_EMBED_URL, '_blank', 'noopener,noreferrer');
  };

  const batchCount = hub?.batches?.length ?? 0;
  const labelCount = hub?.labels?.label_count ?? 0;
  const classCount = hub?.combined_model_classes ?? 31;

  return (
    <section className="datasets-cvat cvat-panel" aria-labelledby="cvat-panel-title">
      <header className="datasets-cvat__hero cvat-panel__hero">
        <span className="datasets-cvat__glow cvat-panel__glow--a" aria-hidden />
        <span className="cvat-panel__glow--b" aria-hidden />
        <div className="cvat-panel__hero-main">
          <div className="datasets-cvat__icon cvat-panel__icon">
            <PenLine size={20} strokeWidth={2.1} />
          </div>
          <div className="datasets-cvat__copy">
            <h2 id="cvat-panel-title" className="datasets-cvat__title">
              {tr('cvat.title', 'CVAT annotation')}
            </h2>
            <p className="datasets-cvat__sub">
              {tr('cvat.subtitle', 'Annotate traffic signs, vehicles, and plates in CVAT. Export YOLO 1.1 back into CamTraffic datasets.')}
            </p>
            <div className="cvat-panel__hero-badges">
              <span className="cvat-panel__hero-badge">
                <Layers size={12} />
                {labelCount} {tr('cvat.labels', 'labels')}
              </span>
              <span className="cvat-panel__hero-badge">
                <ImageIcon size={12} />
                {batchCount} {tr('cvat.batch', 'batches')}
              </span>
              <span className="cvat-panel__hero-badge cvat-panel__hero-badge--live">
                <span className="cvat-panel__hero-badge-dot" aria-hidden />
                {classCount} {tr('cvat.classes', 'classes')}
              </span>
            </div>
          </div>
        </div>
        <div className="cvat-panel__hero-actions">
          <button
            type="button"
            className="cvat-panel__action cvat-panel__action--ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            {tr('common.refresh', 'Refresh')}
          </button>
          <button
            type="button"
            className="cvat-panel__action cvat-panel__action--ghost"
            onClick={handleStagePack}
            disabled={staging}
          >
            <Upload size={15} />
            {staging ? tr('cvat.staging', 'Staging…') : tr('cvat.stagePack', 'Stage vehicle pack')}
          </button>
          <button type="button" className="cvat-panel__action cvat-panel__action--primary" onClick={openCvat}>
            <ExternalLink size={15} />
            {tr('cvat.openExternal', 'Open CVAT')}
          </button>
        </div>
      </header>

      <div className="datasets-cvat__body cvat-panel__body">
        <div className="cvat-panel__workspace">
          <div className="cvat-panel__embed-wrap">
            <div className="cvat-panel__embed-label">
              <Sparkles size={14} />
              {tr('cvat.embedTitle', 'CVAT workspace')}
            </div>
            <div className="datasets-cvat__embed cvat-panel__embed">
              {!embedBlocked ? (
                <iframe
                  title={tr('cvat.embedTitle', 'CVAT annotation workspace')}
                  src={CVAT_EMBED_URL}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer-when-downgrade"
                  onError={() => setEmbedBlocked(true)}
                />
              ) : (
                <div className="datasets-cvat__embed-fallback cvat-panel__embed-fallback">
                  <div className="cvat-panel__embed-fallback-icon">
                    <Layers size={32} strokeWidth={1.75} />
                  </div>
                  <p className="cvat-panel__embed-fallback-title">
                    {tr('cvat.embedBlockedTitle', 'CVAT opens in a new tab')}
                  </p>
                  <p className="cvat-panel__embed-fallback-text">
                    {tr('cvat.embedBlocked', 'CVAT cannot be embedded in this browser. Use Open CVAT to annotate in a new tab.')}
                  </p>
                  <button type="button" className="cvat-panel__action cvat-panel__action--primary" onClick={openCvat}>
                    <ExternalLink size={15} />
                    {tr('cvat.openExternal', 'Open CVAT')}
                  </button>
                </div>
              )}
              {!embedBlocked && (
                <button
                  type="button"
                  className="cvat-panel__embed-hint"
                  onClick={() => setEmbedBlocked(true)}
                >
                  {tr('cvat.embedFallback', 'Embed not loading?')}
                </button>
              )}
            </div>
          </div>

          <aside className="cvat-panel__side">
            <div className="cvat-panel__workflow-card">
              <header className="cvat-panel__workflow-head">
                <span className="cvat-panel__workflow-icon"><PenLine size={16} /></span>
                <h3 className="cvat-panel__workflow-title">{tr('cvat.workflow', 'Workflow')}</h3>
              </header>
              <ol className="cvat-panel__steps">
                {(hub?.workflow?.steps ?? []).map((step, i) => (
                  <li
                    key={step.step}
                    className={cn('cvat-panel__step', `cvat-panel__step--${STEP_TONES[i % STEP_TONES.length]}`)}
                  >
                    <span className="cvat-panel__step-badge">{step.step}</span>
                    <div className="cvat-panel__step-copy">
                      <p className="cvat-panel__step-title">{step.title}</p>
                      <p className="cvat-panel__step-detail">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="cvat-panel__metrics">
              <article className="cvat-panel__metric cvat-panel__metric--violet">
                <span className="cvat-panel__metric-icon"><Layers size={18} /></span>
                <div>
                  <p className="cvat-panel__metric-label">{tr('cvat.labels', 'CVAT labels')}</p>
                  <p className="cvat-panel__metric-value">{loading ? '…' : labelCount}</p>
                  <p className="cvat-panel__metric-hint" title={hub?.labels?.path}>{hub?.labels?.path}</p>
                </div>
              </article>
              <article className="cvat-panel__metric cvat-panel__metric--cyan">
                <span className="cvat-panel__metric-icon"><Sparkles size={18} /></span>
                <div>
                  <p className="cvat-panel__metric-label">{tr('cvat.classes', 'Combined classes')}</p>
                  <p className="cvat-panel__metric-value">{loading ? '…' : classCount}</p>
                  <p className="cvat-panel__metric-hint">YOLO combined model</p>
                </div>
              </article>
            </div>
          </aside>
        </div>

        <section className="cvat-panel__batches">
          <header className="cvat-panel__batches-head">
            <div className="cvat-panel__batches-icon"><FileBox size={18} /></div>
            <div>
              <h3 className="cvat-panel__batches-title">{tr('cvat.batchesTitle', 'Annotation batches')}</h3>
              <p className="cvat-panel__batches-sub">{tr('cvat.batchesSub', 'Dataset packs ready for CVAT import and YOLO export')}</p>
            </div>
            <span className="cvat-panel__batches-count">{batchCount}</span>
          </header>

          <div className="datasets-cvat__table-wrap cvat-panel__table-wrap">
            <table className="enforcement-page__table datasets-cvat__table cvat-panel__table">
              <thead>
                <tr className="enforcement-page__table-head cvat-panel__table-head">
                  <th className="enforcement-page__th text-left">{tr('cvat.batch', 'Batch')}</th>
                  <th className="enforcement-page__th text-left">{tr('cvat.images', 'Images')}</th>
                  <th className="enforcement-page__th text-left">{tr('cvat.source', 'Source')}</th>
                  <th className="enforcement-page__th text-left">{tr('cvat.status', 'Status')}</th>
                  <th className="enforcement-page__th text-left">{tr('cvat.pack', 'CVAT pack')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(5)].map((__, j) => (
                        <td key={j}><div className="enforcement-page__skeleton cvat-panel__skeleton" /></td>
                      ))}
                    </tr>
                  ))
                ) : (hub?.batches ?? []).map((batch) => {
                  const meta = statusMeta(batch.status);
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={batch.id} className={cn('enforcement-page__table-row cvat-panel__row', `cvat-panel__row--${meta.tone}`)}>
                      <td>
                        <div className="cvat-panel__batch-name">
                          <span className={cn('cvat-panel__batch-avatar', `cvat-panel__batch-avatar--${meta.tone}`)}>
                            <FileBox size={14} />
                          </span>
                          <div>
                            <p className="enforcement-page__cell-primary">{batch.name}</p>
                            <p className="enforcement-page__cell-secondary text-xs">{batch.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="datasets-images cvat-panel__images-pill">
                          {batch.exported_images ?? batch.images}
                        </span>
                      </td>
                      <td><code className="datasets-path">{batch.source}</code></td>
                      <td>
                        <span className={cn('cvat-panel__status', `cvat-panel__status--${meta.tone}`)}>
                          <StatusIcon size={11} />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        {batch.cvat_pack ? (
                          <span className="cvat-panel__pack">
                            <FolderOpen size={12} />
                            <span className="truncate">{batch.cvat_pack}</span>
                          </span>
                        ) : (
                          <span className="cvat-panel__pack cvat-panel__pack--empty">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
