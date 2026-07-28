'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { citizenApi } from '@/lib/api';
import { t, useLocale } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const copy = t[locale];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await citizenApi.login(email, password);
      if (user.role !== 'driver') {
        setError('Citizen app is for driver accounts only.');
        return;
      }
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">{copy.appName}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{copy.login}</p>
        </div>
        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? '...' : copy.login}
        </button>
      </form>
    </div>
  );
}
