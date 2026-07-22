'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { Fine } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function FineDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const copy = t[locale];
  const [fine, setFine] = useState<Fine | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [reference, setReference] = useState('');

  useEffect(() => {
    citizenApi.getFine(params.id).then(setFine).catch((err) => setError(err.message));
  }, [params.id]);

  async function pay(e: FormEvent) {
    e.preventDefault();
    if (!fine) return;
    setPaying(true);
    setError('');
    try {
      const updated = await citizenApi.payFine(fine.id, 'manual', reference || undefined);
      setFine(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <AuthGuard>
      <CitizenShell>
        {!fine ? (
          <p className="text-[var(--muted)]">Loading...</p>
        ) : (
          <div className="space-y-4">
            <button className="text-sm text-blue-700" onClick={() => router.back()}>← Back</button>
            <div className="card p-5 space-y-2">
              <h1 className="text-2xl font-bold">${fine.amount}</h1>
              <p>{fine.reason}</p>
              <p className="text-sm text-[var(--muted)]">{fine.location}</p>
              <span className={`badge badge-${fine.status === 'paid' ? 'paid' : fine.status === 'overdue' ? 'overdue' : 'pending'}`}>
                {fine.status}
              </span>
            </div>
            {fine.status !== 'paid' ? (
              <form onSubmit={pay} className="card p-4 space-y-3">
                <h2 className="font-semibold">{copy.payNow}</h2>
                <input
                  className="input"
                  placeholder="Payment reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <button className="btn btn-primary" disabled={paying} type="submit">
                  {paying ? 'Processing...' : copy.payNow}
                </button>
              </form>
            ) : null}
            <button
              className="btn btn-outline"
              onClick={() => router.push(`/appeals?fine=${fine.id}`)}
            >
              {copy.submitAppeal}
            </button>
            {error ? <p className="text-[var(--danger)]">{error}</p> : null}
          </div>
        )}
      </CitizenShell>
    </AuthGuard>
  );
}
