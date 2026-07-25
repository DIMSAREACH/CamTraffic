'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { Violation } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function ViolationsPage() {
  const locale = useLocale();
  const copy = t[locale];
  const [items, setItems] = useState<Violation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    citizenApi.getViolations().then(setItems).catch((err) => setError(err.message));
  }, []);

  return (
    <AuthGuard>
      <CitizenShell>
        <h1 className="text-2xl font-bold mb-4">{copy.violations}</h1>
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card p-4">
              <p className="font-semibold">{item.violation_type}</p>
              <p className="text-sm text-[var(--muted)]">{item.location || item.violation_date}</p>
              <p className="text-sm mt-1">{item.vehicle_plate}</p>
              <span className="badge badge-pending mt-2">{item.status}</span>
            </div>
          ))}
        </div>
      </CitizenShell>
    </AuthGuard>
  );
}
