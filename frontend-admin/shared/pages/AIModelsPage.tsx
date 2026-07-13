import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Brain, CheckCircle, Download, Eye, Pencil, Plus, Rocket, Search, Trash2, Upload, Zap,
} from 'lucide-react';
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
import { AIMlopsHero } from '@shared/components/admin/AIMlopsHero';
import type { AIModelVersion } from '@shared/types';
import { enrichAIModels, formatPct, type EnrichedAIModel, type ModelUiStatus } from '@shared/utils/aiModelUi';

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
];

export function AIModelsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [models, setModels] = useState<EnrichedAIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ModelUiStatus>('all');
  const [form, setForm] = useState({ version: '', model_file: 'best.pt', description: '', accuracy: '' });

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q)
        || m.version.toLowerCase().includes(q)
        || m.dataset.toLowerCase().includes(q)
        || m.model_file.toLowerCase().includes(q)
      );
    });
  }, [models, search, statusFilter]);

  const handleCreate = async () => {
    try {
      await aiModelsAPI.create({
        version: form.version,
        model_file: form.model_file,
        description: form.description,
        accuracy: form.accuracy ? parseFloat(form.accuracy) : undefined,
        is_active: false,
      });
      toast.success(tr('aiModels.toastCreated', 'Model registered'));
      setOpen(false);
      setForm({ version: '', model_file: 'best.pt', description: '', accuracy: '' });
      void load();
    } catch {
      toast.error(tr('aiModels.toastCreateFail', 'Failed to register model'));
    }
  };

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

  return (
    <div className="enforcement-page enforcement-page--ai-mlops ai-mlops">
      <AIMlopsHero
        icon={<Brain size={20} />}
        eyebrow={tr('aiMlops.listEyebrow', 'Model Registry')}
        title={tr('aiMlops.listTitle', 'AI Models')}
        subtitle={tr('aiMlops.listSubtitle', 'Browse, filter, deploy, and manage YOLO model versions')}
        status={[
          { label: tr('aiMlops.totalModels', 'Total Models'), value: loading ? '—' : String(models.length) },
          { label: tr('aiMlops.activeModel', 'Active Model'), value: loading ? '—' : String(models.filter((m) => m.is_active).length) },
          { label: tr('aiMlops.filterStatus', 'Filter status'), value: statusFilter === 'all' ? tr('aiMlops.filterAll', 'All status') : statusFilter },
        ]}
        actions={(
          <>
            <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--primary" onClick={() => setOpen(true)}>
              <Plus size={15} /> {tr('aiMlops.add', 'Add')}
            </button>
            <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--teal" onClick={() => toast.message(tr('aiMlops.importHint', 'Import weights from file storage'))}>
              <Upload size={15} /> {tr('aiMlops.import', 'Import')}
            </button>
            <button type="button" className="ai-mlops-hero__btn ai-mlops-hero__btn--ghost" onClick={() => toast.message(tr('aiMlops.exportHint', 'Export model registry catalog'))}>
              <Download size={15} /> {tr('aiMlops.export', 'Export')}
            </button>
          </>
        )}
      />

      <div className="ai-mlops-toolbar">
        <div className="ai-mlops-toolbar__search">
          <Search size={15} className="ai-mlops-toolbar__search-icon" />
          <input
            className="ai-mlops-toolbar__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr('aiMlops.searchPlaceholder', 'Search models by name, version, or dataset…')}
          />
        </div>
        <select
          className="ai-mlops-toolbar__select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label={tr('aiMlops.filterStatus', 'Filter status')}
        >
          <option value="all">{tr('aiMlops.filterAll', 'All status')}</option>
          <option value="active">{tr('aiMlops.statusActive', 'Active')}</option>
          <option value="draft">{tr('aiMlops.statusDraft', 'Draft')}</option>
          <option value="archive">{tr('aiMlops.statusArchive', 'Archive')}</option>
          <option value="training">{tr('aiMlops.statusTraining', 'Training')}</option>
        </select>
      </div>

      <div className="ai-mlops-panel">
        <div className="ai-mlops-panel__body overflow-x-auto !pt-3">
          <Table className="enforcement-page__table">
            <TableHeader>
              <TableRow className="enforcement-page__table-head">
                {[
                  tr('aiMlops.colModelName', 'Model Name'),
                  tr('aiMlops.colVersion', 'Version'),
                  tr('aiMlops.colDataset', 'Dataset'),
                  tr('aiMlops.colAccuracy', 'Accuracy'),
                  tr('aiMlops.colStatus', 'Status'),
                  tr('aiMlops.colCreated', 'Created'),
                  tr('aiMlops.colAction', 'Action'),
                ].map((h) => (
                  <TableHead key={h} className="enforcement-page__th">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j}><div className="enforcement-page__skeleton" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  tone="violet"
                  icon={<Brain size={28} />}
                  title={tr('aiModels.empty', 'No AI models registered')}
                  subtitle={tr('aiModels.emptyHint', 'Register a YOLO model version to manage detection weights.')}
                  action={{ label: tr('aiMlops.add', 'Add'), onClick: () => setOpen(true), icon: <Plus size={15} /> }}
                />
              ) : filtered.map((m) => (
                <TableRow key={m.id} className={`enforcement-page__table-row${m.is_active ? ' ai-models-page__row--active' : ''}`}>
                  <TableCell><span className="ai-mlops-name">{m.name}</span></TableCell>
                  <TableCell><span className="ai-mlops-version">{m.version}</span></TableCell>
                  <TableCell>{m.dataset}</TableCell>
                  <TableCell><span className="ai-mlops-acc">{formatPct(m.accuracy)}</span></TableCell>
                  <TableCell>
                    <span className={`ai-mlops-badge ai-mlops-badge--${m.status}`}>
                      {m.is_active ? <CheckCircle size={11} /> : null}
                      {m.status === 'active'
                        ? tr('aiMlops.statusActive', 'Active')
                        : m.status === 'archive'
                          ? tr('aiMlops.statusArchive', 'Archive')
                          : m.status === 'training'
                            ? tr('aiMlops.statusTraining', 'Training')
                            : tr('aiMlops.statusDraft', 'Draft')}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(m.uploaded_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="ai-mlops-actions">
                      <Link to={`/admin/ai-models/${m.id}`} className="ai-mlops-action ai-mlops-action--view">
                        <Eye size={12} /> {tr('aiMlops.view', 'View')}
                      </Link>
                      {!m.is_active && (
                        <button type="button" className="ai-mlops-action ai-mlops-action--deploy" onClick={() => void handleActivate(m.id)}>
                          <Rocket size={12} /> {tr('aiMlops.deploy', 'Deploy')}
                        </button>
                      )}
                      <button type="button" className="ai-mlops-action ai-mlops-action--edit" onClick={() => toast.message(tr('aiMlops.editHint', 'Edit metadata from Model Details'))}>
                        <Pencil size={12} /> {tr('aiMlops.edit', 'Edit')}
                      </button>
                      {!m.is_active && (
                        <button type="button" className="ai-mlops-action ai-mlops-action--delete" onClick={() => toast.message(tr('aiMlops.deleteHint', 'Archive models instead of hard-delete in production'))}>
                          <Trash2 size={12} /> {tr('aiMlops.delete', 'Delete')}
                        </button>
                      )}
                    </div>
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
              <span className="enforcement-page__dialog-title">{tr('aiModels.register', 'Register Model')}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>{tr('aiModels.version', 'Version')}</Label><Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} /></div>
            <div><Label>{tr('aiModels.modelFile', 'Weights file path')}</Label><Input value={form.model_file} onChange={(e) => setForm((f) => ({ ...f, model_file: e.target.value }))} /></div>
            <div><Label>{tr('aiModels.description', 'Description')}</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>{tr('aiModels.accuracy', 'Accuracy (%)')}</Label><Input value={form.accuracy} onChange={(e) => setForm((f) => ({ ...f, accuracy: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tr('profile.cancel', 'Cancel')}</Button>
            <Button onClick={() => void handleCreate()}><Zap size={14} className="mr-1" /> {tr('aiModels.register', 'Register Model')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
