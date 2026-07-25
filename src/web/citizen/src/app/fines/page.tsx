'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { Fine } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function FinesPage() {
  const locale = useLocale();
  const copy = t[locale];
  const [fines, setFines] = useState<Fine[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    citizenApi.getFines().then(setFines).catch((err) => setError(err.message));
  }, []);

  return (
    <AuthGuard>
      <CitizenShell>
        <h1 className="text-2xl font-bold mb-4">{copy.fines}</h1>
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
        <div className="space-y-3">
          {fines.map((fine) => (
            <Link key={fine.id} href={`/fines/${fine.id}`} className="card block p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{fine.reason || fine.vehicle_plate || 'Traffic fine'}</p>
                  <p className="text-sm text-[var(--muted)]">{fine.location || fine.due_date || ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${fine.amount}</p>
                  <span className={`badge badge-${fine.status === 'paid' ? 'paid' : fine.status === 'overdue' ? 'overdue' : 'pending'}`}>
                    {fine.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {!fines.length && !error ? <p className="text-[var(--muted)]">{copy.noFines}</p> : null}
        </div>
      </CitizenShell>
    </AuthGuard>
  );
}
