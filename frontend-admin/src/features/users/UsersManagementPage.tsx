import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Input } from '@camtraffic/ui';
import type { CreateUserPayload, UserManagementRecord } from '@camtraffic/types';

interface UsersManagementPageProps {
  onLoad: (params?: { search?: string; role?: string }) => Promise<UserManagementRecord[]>;
  onCreate: (payload: CreateUserPayload) => Promise<{ user: UserManagementRecord; message: string }>;
  onUpdate: (
    userId: string,
    payload: Partial<Pick<UserManagementRecord, 'first_name' | 'last_name' | 'phone' | 'role' | 'is_active'>>,
  ) => Promise<{ user: UserManagementRecord; message: string }>;
  onDelete: (userId: string) => Promise<string>;
}

export function UsersManagementPage({ onLoad, onCreate, onUpdate, onDelete }: UsersManagementPageProps) {
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'officer' | 'driver'>('driver');

  async function refresh(nextSearch = search) {
    setLoading(true);
    setError(null);
    try {
      const data = await onLoad({ search: nextSearch || undefined });
      setUsers(data);
    } catch {
      setError('Unable to load users.');
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
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        is_active: true,
      });
      setMessage(result.message);
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhone('');
      await refresh();
    } catch {
      setError('Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserManagementRecord) {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(user.id, { is_active: !user.is_active });
      await refresh();
    } catch {
      setError('Unable to update user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(userId: string) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onDelete(userId);
      setMessage(result);
      await refresh();
    } catch {
      setError('Unable to delete user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="User Management" subtitle="Task 038 — User CRUD">
      <form className="auth-form" onSubmit={handleCreate}>
        <Input label="Email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="First name"
          name="first_name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Last name"
          name="last_name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <Input label="Phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <label className="auth-form__field">
          <span className="auth-form__label">Role</span>
          <select className="auth-form__select" value={role} onChange={(e) => setRole(e.target.value as never)}>
            <option value="driver">Driver</option>
            <option value="officer">Officer</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <Button type="submit" isLoading={saving}>
          Create user
        </Button>
      </form>

      <div className="users-toolbar">
        <Input label="Search by email" name="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="button" variant="secondary" onClick={() => refresh(search)} isLoading={loading}>
          Search
        </Button>
      </div>

      {error ? <p className="auth-form__error">{error}</p> : null}
      {message ? <p className="auth-form__success">{message}</p> : null}

      <div className="users-list">
        {users.map((user) => (
          <article className="users-list__item" key={user.id}>
            <p>
              <strong>{user.email}</strong> · {user.role} · {user.is_active ? 'Active' : 'Inactive'}
            </p>
            <p className="auth-form__hint">
              {user.first_name} {user.last_name} · {user.phone || 'No phone'}
            </p>
            <div className="users-list__actions">
              <Button type="button" variant="secondary" onClick={() => toggleActive(user)} isLoading={saving}>
                {user.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleDelete(user.id)} isLoading={saving}>
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
