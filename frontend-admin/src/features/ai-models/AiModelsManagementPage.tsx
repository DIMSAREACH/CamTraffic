import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  AIModelManagementRecord,
  AIModelType,
  CreateAIModelPayload,
  UpdateAIModelPayload,
} from '@camtraffic/types';

interface AiModelsManagementPageProps {
  onLoad: (params?: { search?: string; model_type?: string }) => Promise<AIModelManagementRecord[]>;
  onCreate: (payload: CreateAIModelPayload) => Promise<{ model: AIModelManagementRecord; message: string }>;
  onUpdate: (
    modelId: number,
    payload: UpdateAIModelPayload,
  ) => Promise<{ model: AIModelManagementRecord; message: string }>;
  onDelete: (modelId: number) => Promise<string>;
}

export function AiModelsManagementPage({ onLoad, onCreate, onUpdate, onDelete }: AiModelsManagementPageProps) {
  const [models, setModels] = useState<AIModelManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [modelTypeFilter, setModelTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [modelType, setModelType] = useState<AIModelType>('yolo');
  const [description, setDescription] = useState('');

  async function refresh(nextSearch = search, nextModelTypeFilter = modelTypeFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        model_type: nextModelTypeFilter || undefined,
      });
      setModels(data);
    } catch {
      setError('Unable to load AI models.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        name,
        slug,
        model_type: modelType,
        description,
        is_active: true,
      });
      setMessage(result.message);
      setName('');
      setSlug('');
      setModelType('yolo');
      setDescription('');
      await refresh();
    } catch {
      setError('Unable to create AI model.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(model: AIModelManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(model.id, { is_active: !model.is_active });
      await refresh();
    } catch {
      setError('Unable to update AI model.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(modelId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(modelId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete AI model.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="AI Model Management" subtitle="Task 043 — AI model catalog CRUD">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Model name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input label="Slug" name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
        <label className="auth-form__field">
          <span className="auth-form__label">Model type</span>
          <select
            className="auth-form__select"
            value={modelType}
            onChange={(event) => setModelType(event.target.value as AIModelType)}
          >
            <option value="yolo">YOLO</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Create model
        </Button>
      </form>

      <div className="ai-models-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Type filter</span>
          <select
            className="auth-form__select"
            value={modelTypeFilter}
            onChange={(event) => setModelTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            <option value="yolo">YOLO</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(search, modelTypeFilter)} isLoading={loading}>
          Search
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading AI models...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="ai-models-list">
        {models.map((model) => (
          <article className="ai-models-list__item" key={model.id}>
            <p>
              <strong>{model.name}</strong> · {model.slug} · {model.model_type} ·{' '}
              {model.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="auth-form__hint">
              {model.description || 'No description'} · {model.version_count} version
              {model.version_count === 1 ? '' : 's'}
            </p>
            <div className="ai-models-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(model)} isLoading={saving}>
                {model.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(model.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
