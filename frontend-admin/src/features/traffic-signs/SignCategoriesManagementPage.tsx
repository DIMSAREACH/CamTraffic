import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateSignCategoryPayload,
  SignCategoryManagementRecord,
  UpdateSignCategoryPayload,
} from '@camtraffic/types';

interface SignCategoriesManagementPageProps {
  onLoad: (params?: { search?: string }) => Promise<SignCategoryManagementRecord[]>;
  onCreate: (
    payload: CreateSignCategoryPayload,
  ) => Promise<{ category: SignCategoryManagementRecord; message: string }>;
  onUpdate: (
    categoryId: number,
    payload: UpdateSignCategoryPayload,
  ) => Promise<{ category: SignCategoryManagementRecord; message: string }>;
  onDelete: (categoryId: number) => Promise<string>;
}

export function SignCategoriesManagementPage({ onLoad, onCreate, onUpdate, onDelete }: SignCategoriesManagementPageProps) {
  const [categories, setCategories] = useState<SignCategoryManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameKm, setNameKm] = useState('');
  const [description, setDescription] = useState('');

  async function refresh(nextSearch = search) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({ search: nextSearch || undefined });
      setCategories(data);
    } catch {
      setError('Unable to load sign categories.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        code,
        name_en: nameEn,
        name_km: nameKm,
        description,
        is_active: true,
      });
      setMessage(result.message);
      setCode('');
      setNameEn('');
      setNameKm('');
      setDescription('');
      await refresh();
    } catch {
      setError('Unable to create sign category.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: SignCategoryManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(category.id, { is_active: !category.is_active });
      await refresh();
    } catch {
      setError('Unable to update sign category.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(categoryId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(categoryId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete sign category. It may still have assigned traffic signs.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Sign Category Management" subtitle="Task 051 — Traffic sign category CRUD">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Category code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
        <Input
          label="English name"
          name="name_en"
          value={nameEn}
          onChange={(event) => setNameEn(event.target.value)}
          required
        />
        <Input
          label="Khmer name"
          name="name_km"
          value={nameKm}
          onChange={(event) => setNameKm(event.target.value)}
          required
        />
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Create category
        </Button>
      </form>

      <div className="sign-categories-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" variant="secondary" onClick={() => refresh(search)} isLoading={loading}>
          Filter
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading sign categories...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="sign-categories-list">
        {categories.map((category) => (
          <article className="sign-categories-list__item" key={category.id}>
            <p>
              <strong>
                {category.code} — {category.name_en}
              </strong>{' '}
              · {category.is_active ? 'active' : 'inactive'} · {category.sign_count} signs
            </p>
            <p className="auth-form__hint">
              {category.name_km}
              {category.description ? ` · ${category.description}` : ''}
            </p>
            <div className="sign-categories-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(category)} isLoading={saving}>
                {category.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(category.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
