import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type { CreateRolePayload, RoleManagementRecord, UpdateRolePayload } from '@camtraffic/types';

interface RolesManagementPageProps {
  onLoad: () => Promise<RoleManagementRecord[]>;
  onCreate: (payload: CreateRolePayload) => Promise<{ role: RoleManagementRecord; message: string }>;
  onUpdate: (roleId: number, payload: UpdateRolePayload) => Promise<{ role: RoleManagementRecord; message: string }>;
  onDelete: (roleId: number) => Promise<string>;
}

export function RolesManagementPage({ onLoad, onCreate, onUpdate, onDelete }: RolesManagementPageProps) {
  const [roles, setRoles] = useState<RoleManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad();
      setRoles(data);
    } catch {
      setError('Unable to load roles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onCreate({ name, slug, description, is_active: true });
      setMessage(result.message);
      setName('');
      setSlug('');
      setDescription('');
      await refresh();
    } catch {
      setError('Unable to create role.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(role: RoleManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(role.id, { is_active: !role.is_active });
      await refresh();
    } catch {
      setError('Unable to update role.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(roleId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(roleId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete role.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Role Management" subtitle="Task 039 — Role CRUD">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Role name" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Role slug" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Create role
        </Button>
      </form>

      {loading ? <p className="auth-form__hint">Loading roles...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="roles-list">
        {roles.map((role) => (
          <article className="roles-list__item" key={role.id}>
            <p>
              <strong>{role.name}</strong> · {role.slug} · {role.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="auth-form__hint">{role.description || 'No description'}</p>
            <div className="roles-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(role)} isLoading={saving}>
                {role.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(role.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
