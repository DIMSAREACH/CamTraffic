import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type {
  CreatePermissionPayload,
  PermissionManagementRecord,
  UpdatePermissionPayload,
} from '@camtraffic/types';

interface PermissionsManagementPageProps {
  onLoad: () => Promise<PermissionManagementRecord[]>;
  onCreate: (payload: CreatePermissionPayload) => Promise<{ permission: PermissionManagementRecord; message: string }>;
  onUpdate: (
    permissionId: number,
    payload: UpdatePermissionPayload,
  ) => Promise<{ permission: PermissionManagementRecord; message: string }>;
  onDelete: (permissionId: number) => Promise<string>;
}

export function PermissionsManagementPage({
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
}: PermissionsManagementPageProps) {
  const [permissions, setPermissions] = useState<PermissionManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [codename, setCodename] = useState('');
  const [name, setName] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad();
      setPermissions(data);
    } catch {
      setError('Unable to load permissions.');
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
      const result = await onCreate({ codename, name, module: moduleName, description });
      setMessage(result.message);
      setCodename('');
      setName('');
      setModuleName('');
      setDescription('');
      await refresh();
    } catch {
      setError('Unable to create permission.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(permission: PermissionManagementRecord) {
    const nextName = window.prompt('New permission name', permission.name)?.trim();
    if (!nextName || nextName === permission.name) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onUpdate(permission.id, { name: nextName });
      await refresh();
    } catch {
      setError('Unable to update permission.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(permissionId: number) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(permissionId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete permission.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Permission Management" subtitle="Task 040 — Permission CRUD">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input
          label="Codename"
          name="codename"
          value={codename}
          onChange={(event) => setCodename(event.target.value)}
          required
        />
        <Input label="Name" name="name" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input
          label="Module"
          name="module"
          value={moduleName}
          onChange={(event) => setModuleName(event.target.value)}
          required
        />
        <Input
          label="Description"
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button type="submit" isLoading={saving}>
          Create permission
        </Button>
      </form>

      {loading ? <p className="auth-form__hint">Loading permissions...</p> : null}
      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="permissions-list">
        {permissions.map((permission) => (
          <article className="permissions-list__item" key={permission.id}>
            <p>
              <strong>{permission.module}</strong> · {permission.codename}
            </p>
            <p>{permission.name}</p>
            <p className="auth-form__hint">{permission.description || 'No description'}</p>
            <div className="permissions-list__actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleRename(permission)}
                isLoading={saving}
              >
                Rename
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(permission.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
