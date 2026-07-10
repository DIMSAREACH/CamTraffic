import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  AIModelVersionRecord,
  AITrainingHistoryRecord,
  AITrainingStatus,
  CreateAITrainingHistoryPayload,
  UpdateAITrainingHistoryPayload,
} from '@camtraffic/types';

interface AiTrainingHistoryPanelProps {
  onLoadVersions: (params?: { model_id?: string; status?: string }) => Promise<AIModelVersionRecord[]>;
  onLoad: (params?: { model_id?: string; version_id?: string; status?: string }) => Promise<AITrainingHistoryRecord[]>;
  onCreate: (payload: CreateAITrainingHistoryPayload) => Promise<{ record: AITrainingHistoryRecord; message: string }>;
  onUpdate: (
    recordId: number,
    payload: UpdateAITrainingHistoryPayload,
  ) => Promise<{ record: AITrainingHistoryRecord; message: string }>;
  onDelete: (recordId: number) => Promise<string>;
}

export function AiTrainingHistoryPanel({
  onLoadVersions,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: AiTrainingHistoryPanelProps) {
  const [versions, setVersions] = useState<AIModelVersionRecord[]>([]);
  const [records, setRecords] = useState<AITrainingHistoryRecord[]>([]);
  const [versionFilter, setVersionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [versionId, setVersionId] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [epochs, setEpochs] = useState('10');
  const [batchSize, setBatchSize] = useState('16');
  const [learningRate, setLearningRate] = useState('');
  const [logSummary, setLogSummary] = useState('');

  async function refresh(nextVersionFilter = versionFilter, nextStatusFilter = statusFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        version_id: nextVersionFilter || undefined,
        status: nextStatusFilter || undefined,
      });
      setRecords(data);
    } catch {
      setError('Unable to load training history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const versionData = await onLoadVersions();
        setVersions(versionData);
        if (versionData.length > 0) {
          setVersionId(String(versionData[0].id));
        }
      } catch {
        setError('Unable to load model versions for training history.');
      }
      await refresh('', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!versionId) {
      setError('Select a model version before logging training.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        model_version_id: Number(versionId),
        dataset_name: datasetName,
        epochs: Number(epochs),
        batch_size: Number(batchSize),
        learning_rate: learningRate ? Number(learningRate) : null,
        log_summary: logSummary,
        status: 'running',
      });
      setMessage(result.message);
      setDatasetName('');
      setEpochs('10');
      setBatchSize('16');
      setLearningRate('');
      setLogSummary('');
      await refresh();
    } catch {
      setError('Unable to create training history record.');
    } finally {
      setSaving(false);
    }
  }

  async function markCompleted(record: AITrainingHistoryRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(record.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await refresh();
    } catch {
      setError('Unable to update training record.');
    } finally {
      setSaving(false);
    }
  }

  async function markFailed(record: AITrainingHistoryRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(record.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
      });
      await refresh();
    } catch {
      setError('Unable to update training record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(recordId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(recordId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete training record.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="AI Training History" subtitle="Task 045 — Training run logs and outcomes">
      <form className="auth-form" onSubmit={handleCreate}>
        <label className="auth-form__field">
          <span className="auth-form__label">Model version</span>
          <select className="auth-form__select" value={versionId} onChange={(event) => setVersionId(event.target.value)}>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.model_name} v{version.version}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Dataset name"
          name="dataset_name"
          value={datasetName}
          onChange={(event) => setDatasetName(event.target.value)}
          required
        />
        <Input label="Epochs" name="epochs" value={epochs} onChange={(event) => setEpochs(event.target.value)} required />
        <Input
          label="Batch size"
          name="batch_size"
          value={batchSize}
          onChange={(event) => setBatchSize(event.target.value)}
          required
        />
        <Input
          label="Learning rate"
          name="learning_rate"
          value={learningRate}
          onChange={(event) => setLearningRate(event.target.value)}
        />
        <Input
          label="Log summary"
          name="log_summary"
          value={logSummary}
          onChange={(event) => setLogSummary(event.target.value)}
        />
        <Button type="submit" isLoading={saving} disabled={versions.length === 0}>
          Log training run
        </Button>
      </form>

      <div className="ai-training-history-toolbar">
        <label className="auth-form__field">
          <span className="auth-form__label">Version filter</span>
          <select
            className="auth-form__select"
            value={versionFilter}
            onChange={(event) => setVersionFilter(event.target.value)}
          >
            <option value="">All versions</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.model_slug} v{version.version}
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
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(versionFilter, statusFilter)} isLoading={loading}>
          Filter
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading training history...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="ai-training-history-list">
        {records.map((record) => (
          <article className="ai-training-history-list__item" key={record.id}>
            <p>
              <strong>
                {record.model_name} v{record.version_label}
              </strong>{' '}
              · {record.status as AITrainingStatus} · {record.dataset_name}
            </p>
            <p className="auth-form__hint">
              Epochs {record.epochs} · Batch {record.batch_size}
              {record.learning_rate != null ? ` · LR ${record.learning_rate}` : ''}
              {record.final_accuracy != null ? ` · Accuracy ${(record.final_accuracy * 100).toFixed(1)}%` : ''}
            </p>
            <p className="auth-form__hint">
              Started {new Date(record.started_at).toLocaleString()}
              {record.completed_at ? ` · Completed ${new Date(record.completed_at).toLocaleString()}` : ''}
              {record.triggered_by_email ? ` · By ${record.triggered_by_email}` : ''}
            </p>
            <p className="auth-form__hint">{record.log_summary || 'No log summary'}</p>
            <div className="ai-training-history-list__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => markCompleted(record)}
                isLoading={saving}
                disabled={record.status === 'completed'}
              >
                Mark completed
              </Button>
              <Button type="button" variant="secondary" onClick={() => markFailed(record)} isLoading={saving}>
                Mark failed
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(record.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
