import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreateTrafficSignPayload,
  SignCategoryOption,
  TrafficSignManagementRecord,
  UpdateTrafficSignPayload,
} from '@camtraffic/types';

interface TrafficSignsManagementPageProps {
  onLoadCategories: () => Promise<SignCategoryOption[]>;
  onLoad: (params?: { search?: string; category_id?: string }) => Promise<TrafficSignManagementRecord[]>;
  onCreate: (payload: CreateTrafficSignPayload) => Promise<{ sign: TrafficSignManagementRecord; message: string }>;
  onUpdate: (
    signId: number,
    payload: UpdateTrafficSignPayload,
  ) => Promise<{ sign: TrafficSignManagementRecord; message: string }>;
  onDelete: (signId: number) => Promise<string>;
}

export function TrafficSignsManagementPage({
  onLoadCategories,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: TrafficSignsManagementPageProps) {
  const [categories, setCategories] = useState<SignCategoryOption[]>([]);
  const [signs, setSigns] = useState<TrafficSignManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameKm, setNameKm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [fineAmount, setFineAmount] = useState('0');

  async function refresh(nextSearch = search, nextCategoryFilter = categoryFilter) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({
        search: nextSearch || undefined,
        category_id: nextCategoryFilter || undefined,
      });
      setSigns(data);
    } catch {
      setError('Unable to load traffic signs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const categoryData = await onLoadCategories();
        setCategories(categoryData);
        if (categoryData.length > 0) {
          setCategoryId(String(categoryData[0].id));
        }
      } catch {
        setError('Unable to load sign categories.');
      }
      await refresh('', '');
    }

    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId) {
      setError('Select a category before creating a traffic sign.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({
        code,
        name_en: nameEn,
        name_km: nameKm,
        category_id: Number(categoryId),
        description,
        fine_amount: fineAmount,
        is_active: true,
      });
      setMessage(result.message);
      setCode('');
      setNameEn('');
      setNameKm('');
      setDescription('');
      setFineAmount('0');
      await refresh();
    } catch {
      setError('Unable to create traffic sign.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(sign: TrafficSignManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(sign.id, { is_active: !sign.is_active });
      await refresh();
    } catch {
      setError('Unable to update traffic sign.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(signId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(signId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete traffic sign.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Traffic Sign Management" subtitle="Task 050 — Traffic sign CRUD and fine configuration">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Sign code" name="code" value={code} onChange={(event) => setCode(event.target.value)} required />
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
        <label className="auth-form__field">
          <span className="auth-form__label">Category</span>
          <select
            className="auth-form__select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.code} — {category.name_en}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Input
          label="Fine amount (KHR)"
          name="fine_amount"
          value={fineAmount}
          onChange={(event) => setFineAmount(event.target.value)}
          required
        />
        <Button type="submit" isLoading={saving} disabled={categories.length === 0}>
          Create traffic sign
        </Button>
      </form>

      <div className="traffic-signs-toolbar">
        <Input label="Search" name="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Category filter</span>
          <select
            className="auth-form__select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.code} — {category.name_en}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" variant="secondary" onClick={() => refresh(search, categoryFilter)} isLoading={loading}>
          Filter
        </Button>
      </div>

      {loading ? <p className="auth-form__hint">Loading traffic signs...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="traffic-signs-list">
        {signs.map((sign) => (
          <article className="traffic-signs-list__item" key={sign.id}>
            {sign.image_url ? (
              <img className="traffic-signs-list__thumb" src={sign.image_url} alt={sign.name_en} />
            ) : null}
            <div className="traffic-signs-list__body">
              <p>
                <strong>
                  {sign.code} — {sign.name_en}
                </strong>{' '}
                · {sign.is_active ? 'active' : 'inactive'}
              </p>
              <p className="auth-form__hint">
                {sign.name_km} · {sign.category_code} {sign.category_name}
              </p>
              <p className="auth-form__hint">
                Fine {Number(sign.fine_amount).toLocaleString()} KHR
                {sign.description ? ` · ${sign.description}` : ''}
              </p>
              <div className="traffic-signs-list__actions">
                <Button type="button" variant="secondary" onClick={() => toggleActive(sign)} isLoading={saving}>
                  {sign.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => handleDelete(sign.id)} isLoading={saving}>
                  Delete
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
