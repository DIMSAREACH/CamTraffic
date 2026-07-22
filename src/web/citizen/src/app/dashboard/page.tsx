'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { DriverDashboardStats } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function DashboardPage() {
  const locale = useLocale();
  const copy = t[locale];
  const [stats, setStats] = useState<DriverDashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    citizenApi
      .getDashboard()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, []);

  return (
    <AuthGuard>
      <CitizenShell>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{copy.welcome}</h1>
            <p className="text-[var(--muted)]">{copy.dashboard}</p>
          </div>
          {error ? <p className="text-[var(--danger)]">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={copy.fines} value={stats?.total_fines ?? 0} />
            <StatCard label={copy.pending} value={stats?.pending_fines ?? 0} />
            <StatCard label={copy.paid} value={stats?.paid_fines ?? 0} />
            <StatCard label={copy.violations} value={stats?.total_violations ?? 0} />
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{copy.fines}</h2>
              <Link href="/fines" className="text-sm text-blue-700">View all</Link>
            </div>
            <div className="space-y-2">
              {(stats?.recent_fines || []).slice(0, 5).map((fine) => (
                <Link key={fine.id} href={`/fines/${fine.id}`} className="flex justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span>{fine.reason || fine.vehicle_plate || fine.id.slice(0, 8)}</span>
                  <span className="font-semibold">${fine.amount}</span>
                </Link>
              ))}
              {!stats?.recent_fines?.length ? <p className="text-sm text-[var(--muted)]">{copy.noFines}</p> : null}
            </div>
          </div>
        </div>
      </CitizenShell>
    </AuthGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}
