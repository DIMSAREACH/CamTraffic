import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  AIModelManagementRecord,
  AIModelVersionRecord,
  AIModelVersionStatus,
  CreateAIModelVersionPayload,
  UpdateAIModelVersionPayload,
} from '@camtraffic/types';

interface AiModelVersionsPanelProps {
  onLoadModels: () => Promise<AIModelManagementRecord[]>;
  onLoadVersions: (params?: { model_id?: string; status?: string }) => Promise<AIModelVersionRecord[]>;
  onCreate: (payload: CreateAIModelVersionPayload) => Promise<{ version: AIModelVersionRecord; message: string }>;
  onUpdate: (
    versionId: number,
    payload: UpdateAIModelVersionPayload,
  ) => Promise<{ version: AIModelVersionRecord; message: string }>;
  onActivate: (versionId: number) => Promise<{ version: AIModelVersionRecord; message: string }>;
  onDelete: (versionId: number) => Promise<string>;
}

export function AiModelVersionsPanel({
  onLoadModels,
  onLoadVersions,
  onCreate,
  onUpdate,
  onActivate,
  onDelete,
}: AiModelVersionsPanelProps) {
  const [models, setModels] = useState<AIModelManagementRecord[]>([]);
  const [versions, setVersions] = useState<AIModelVersionRecord[]>([]);
  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modelId, setModelId] = useState('');
  const [version, setVersion] = useState('');
  const [weightsPath, setWeightsPath] = useState('');
  const [status, setStatus] = useState<AIModelVersionStatus>('training');
  const [accuracy, setAccuracy] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');

  async function refresh(nextModelFilter = modelFilter, nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoadVersions({
        model_id: nextModelFilter || undefined,
        status: nextStatusFilter || undefined,
      });
      setVersions(data);
    } catch {
      setError('Unable to load model versions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const modelData = await onLoadModels();
        setModels(modelData);
        if (modelData.length > 0) {
          setModelId(String(modelData[0].id));
        }
      } catch {
        setError('Unable to load AI models for version management.');
      }
      await refresh('', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modelId) {
      setError('Select an AI model before creating a version.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        model_id: Number(modelId),
        version,
        weights_path: weightsPath,
        status,
        accuracy: accuracy ? Number(accuracy) : null,
        training_notes: trainingNotes,
        is_active: false,
      });
      setMessage(result.message);
      setVersion('');
      setWeightsPath('');
      setStatus('training');
      setAccuracy('');
      setTrainingNotes('');
      await refresh();
    } catch {
      setError('Unable to create model version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(versionRecord: AIModelVersionRecord) {
    setSaving(true);
    setError(null);
    try {
      const result = await onActivate(versionRecord.id);
      setMessage(result.message);
      await refresh();
    } catch {
      setError('Unable to activate model version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeprecate(versionRecord: AIModelVersionRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(versionRecord.id, { status: 'deprecated', is_active: false });
      await refresh();
    } catch {
      setError('Unable to update model version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(versionId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(versionId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete model version.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="AI Model Versioning" subtitle="Task 044 — Version lifecycle and activation">
      <form className="auth-form" onSubmit={handleCreate}>
        <label className="auth-form__field">
          <span className="auth-form__label">AI model</span>
          <select className="auth-form__select" value={modelId} onChange={(event) => setModelId(event.target.value)}>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.slug})
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Version"
          name="version"
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          required
        />
        <Input
          label="Weights path"
          name="weights_path"
          value={weightsPath}
          onChange={(event) => setWeightsPath(event.target.value)}
          required
        />
        <label className="auth-form__field">
          <span className="auth-form__label">Status</span>
          <select
            className="auth-form__select"
            value={status}
            onChange={(event) => setStatus(event.target.value as AIModelVersionStatus)}
          >
            <option value="training">Training</option>
            <option value="ready">Ready</option>
            <option value="deprecated">Deprecated</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <Input
          label="Accuracy"
          name="accuracy"
          value={accuracy}
          onChange={(event) => setAccuracy(event.target.value)}
        />
        <Input
          label="Training notes"
          name="training_notes"
          value={trainingNotes}
          onChange={(event) => setTrainingNotes(event.target.value)}
        />
        <Button type="submit" isLoading={saving} disabled={models.length === 0}>
          Create version
        </Button>
      </form>

      <div className="ai-model-versions-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Model filter</span>
          <select
            className="auth-form__select"
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
          >
            <option value="">All models</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.slug}
              </option>
            ))}
          </select>
        </label>
        <label className="auth-form__field">
          <span className="auth-form__label">Status filter</span>
          <select
            className="auth-form__select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="training">Training</option>
            <option value="ready">Ready</option>
            <option value="deprecated">Deprecated</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(modelFilter, statusFilter)} isLoading={loading}>
          Filter
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading versions...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="ai-model-versions-list">
        {versions.map((versionRecord) => (
          <article className="ai-model-versions-list__item" key={versionRecord.id}>
            <p>
              <strong>
                {versionRecord.model_name} v{versionRecord.version}
              </strong>{' '}
              · {versionRecord.status} · {versionRecord.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="auth-form__hint">
              {versionRecord.weights_path}
              {versionRecord.accuracy != null ? ` · Accuracy ${(versionRecord.accuracy * 100).toFixed(1)}%` : ''}
            </p>
            <p className="auth-form__hint">{versionRecord.training_notes || 'No training notes'}</p>
            <div className="ai-model-versions-list__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleActivate(versionRecord)}
                isLoading={saving}
                disabled={versionRecord.is_active}
              >
                Activate
              </Button>
              <Button type="button" variant="secondary" onClick={() => handleDeprecate(versionRecord)} isLoading={saving}>
                Deprecate
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(versionRecord.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
