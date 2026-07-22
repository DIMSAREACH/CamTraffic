'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { Appeal } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function AppealsPage() {
  const locale = useLocale();
  const copy = t[locale];
  const [items, setItems] = useState<Appeal[]>([]);
  const [fineId, setFineId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFineId(params.get('fine') || '');
  }, []);

  useEffect(() => {
    citizenApi.getAppeals().then(setItems).catch((err) => setError(err.message));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!fineId || !reason.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const appeal = await citizenApi.submitAppeal(fineId, reason.trim());
      setItems((prev) => [appeal, ...prev]);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard>
      <CitizenShell>
        <h1 className="text-2xl font-bold mb-4">{copy.appeals}</h1>
        <form onSubmit={submit} className="card p-4 space-y-3 mb-6">
          <h2 className="font-semibold">{copy.submitAppeal}</h2>
          <input className="input" placeholder="Fine ID" value={fineId} onChange={(e) => setFineId(e.target.value)} required />
          <textarea className="input min-h-24" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
          <button className="btn btn-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : copy.submitAppeal}
          </button>
        </form>
        {error ? <p className="text-[var(--danger)] mb-4">{error}</p> : null}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <p className="font-semibold">Fine {item.fine_id.slice(0, 8)}...</p>
              <p className="text-sm mt-1">{item.reason}</p>
              <span className="badge badge-pending mt-2">{item.status}</span>
            </div>
          ))}
        </div>
      </CitizenShell>
    </AuthGuard>
  );
}
