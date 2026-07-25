import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, CheckCircle, Plus, Sparkles, Zap } from 'lucide-react';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@shared/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/components/ui/table';
import { TableEmptyState } from '@shared/components/ui/TableEmptyState';
import { useAuth } from '@shared/context/AuthContext';
import { useLanguage } from '@shared/context/LanguageContext';
import { aiModelsAPI } from '@shared/services/api';
import { toast } from 'sonner';
import { AiTrainingHistoryPanel } from '@shared/components/admin/AiTrainingHistoryPanel';
import type { AIModelVersion } from '@shared/types';

export function AIModelsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [models, setModels] = useState<AIModelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ version: '', model_file: 'best.pt', description: '', accuracy: '' });

  const load = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setLoading(true);
    try {
      setModels(await aiModelsAPI.getAll());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const withAccuracy = models.filter((m) => m.accuracy != null);
    const avgAccuracy = withAccuracy.length
      ? Math.round(withAccuracy.reduce((sum, m) => sum + (m.accuracy ?? 0), 0) / withAccuracy.length)
      : null;
    return {
      total: models.length,
      active: models.filter((m) => m.is_active).length,
      avgAccuracy: avgAccuracy != null ? `${avgAccuracy}%` : '—',
      versions: new Set(models.map((m) => m.version)).size,
    };
  }, [models]);

  const handleCreate = async () => {
    try {
      await aiModelsAPI.create({
        version: form.version,
        model_file: form.model_file,
        description: form.description,
        accuracy: form.accuracy ? parseFloat(form.accuracy) : undefined,
        is_active: false,
      });
      toast.success(t('aiModels.toastCreated'));
      setOpen(false);
      setForm({ version: '', model_file: 'best.pt', description: '', accuracy: '' });
      load();
    } catch {
      toast.error(t('aiModels.toastCreateFail'));
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await aiModelsAPI.activate(id);
      toast.success(t('aiModels.toastActivated'));
      load();
    } catch {
      toast.error(t('aiModels.toastActivateFail'));
    }
  };

  if (user?.role !== 'admin') {
    return <div className="enforcement-page p-8">{t('aiModels.adminOnly')}</div>;
  }

  return (
    <div className="enforcement-page enforcement-page--ai-models">
      <div className="enforcement-page__hero">
        <div className="enforcement-page__hero-glow--primary" aria-hidden />
        <div className="enforcement-page__hero-glow--secondary" aria-hidden />
        <div className="enforcement-page__hero-inner">
          <div>
            <div className="enforcement-page__eyebrow">
              <span className="enforcement-page__eyebrow-icon"><Brain size={14} /></span>
              {t('pages.aiModels.eyebrow')}
            </div>
            <h1 className="enforcement-page__title">{t('pages.aiModels.title')}</h1>
            <p className="enforcement-page__subtitle">{t('pages.aiModels.subtitle')}</p>
          </div>
          <button type="button" className="enforcement-page__hero-btn enforcement-page__hero-btn--violet" onClick={() => setOpen(true)}>
            <Plus size={16} /> {t('aiModels.register')}
          </button>
        </div>
      </div>

      <div className="enforcement-page__stat-grid enforcement-page__stat-grid--four mb-6">
        <div className="enforcement-page__stat-card enforcement-page__stat-card--violet">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--violet"><Brain size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.total}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--violet">{t('aiModels.statTotal')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--emerald">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--emerald"><Zap size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.active}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--emerald">{t('aiModels.statActive')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--blue">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--blue"><Sparkles size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.avgAccuracy}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--blue">{t('aiModels.statAvgAccuracy')}</p>
          </div>
        </div>
        <div className="enforcement-page__stat-card enforcement-page__stat-card--teal">
          <div className="enforcement-page__stat-icon enforcement-page__stat-icon--teal"><CheckCircle size={18} /></div>
          <div className="enforcement-page__stat-copy">
            <p className="enforcement-page__stat-value">{counts.versions}</p>
            <p className="enforcement-page__stat-label enforcement-page__stat-label--teal">{t('aiModels.statVersions')}</p>
          </div>
        </div>
      </div>

      <div className="enforcement-page__panel">
        <div className="overflow-x-auto">
        <Table className="enforcement-page__table mgmt-table__grid">
          <TableHeader>
            <TableRow className="enforcement-page__table-head">
              {[t('aiModels.colVersion'), t('aiModels.colFile'), t('aiModels.colAccuracy'), t('aiModels.colActive'), t('aiModels.colActions')].map((h) => (
                <TableHead key={h} className="enforcement-page__th">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(5)].map((__, j) => (
                    <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : models.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                tone="violet"
                icon={<Brain size={28} />}
                title={t('aiModels.empty')}
                subtitle={t('aiModels.emptyHint')}
                action={{ label: t('aiModels.register'), onClick: () => setOpen(true), icon: <Plus size={15} /> }}
              />
            ) : models.map((m) => (
              <TableRow key={m.id} className={`enforcement-page__table-row${m.is_active ? ' ai-models-page__row--active' : ''}`}>
                <TableCell>
                  <span className="ai-models-page__version">{m.version}</span>
                </TableCell>
                <TableCell><code className="ai-models-page__file">{m.model_file}</code></TableCell>
                <TableCell>
                  {m.accuracy != null ? (
                    <span className="ai-models-page__accuracy">{m.accuracy}%</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {m.is_active ? (
                    <span className="enforcement-page__badge ai-models-page__badge--active">
                      <CheckCircle size={11} /> {t('aiModels.active')}
                    </span>
                  ) : (
                    <span className="ai-models-page__badge--inactive">{t('aiModels.inactive')}</span>
                  )}
                </TableCell>
                <TableCell>
                  {!m.is_active && (
                    <button type="button" className="ai-models-page__activate-btn" onClick={() => handleActivate(m.id)}>
                      <Zap size={13} /> {t('aiModels.activate')}
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent accent="violet" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="users-page__dialog-header">
              <div className="enforcement-page__dialog-icon enforcement-page__dialog-icon--violet">
                <Brain size={15} aria-hidden />
              </div>
              <span className="enforcement-page__dialog-title">{t('aiModels.register')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{t('aiModels.version')}</Label><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} /></div>
            <div><Label>{t('aiModels.modelFile')}</Label><Input value={form.model_file} onChange={(e) => setForm((f) => ({ ...f, model_file: e.target.value }))} /></div>
            <div><Label>{t('aiModels.description')}</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>{t('aiModels.accuracy')}</Label><Input value={form.accuracy} onChange={(e) => setForm((f) => ({ ...f, accuracy: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('profile.cancel')}</Button>
            <Button onClick={handleCreate}>{t('aiModels.register')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AiTrainingHistoryPanel models={models} />
    </div>
  );
}
