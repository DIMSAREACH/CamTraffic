'use client';

import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { CitizenShell } from '@/components/CitizenShell';
import { citizenApi } from '@/lib/api';
import type { Vehicle } from '@/lib/types';
import { t, useLocale } from '@/lib/i18n';

export default function VehiclesPage() {
  const locale = useLocale();
  const copy = t[locale];
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    citizenApi.getVehicles().then(setVehicles).catch((err) => setError(err.message));
  }, []);

  return (
    <AuthGuard>
      <CitizenShell>
        <h1 className="text-2xl font-bold mb-4">{copy.vehicles}</h1>
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="card p-4">
              <p className="font-semibold text-lg">{vehicle.plate_number}</p>
              <p className="text-sm text-[var(--muted)]">
                {[vehicle.make, vehicle.model, vehicle.vehicle_type].filter(Boolean).join(' · ')}
              </p>
            </div>
          ))}
        </div>
      </CitizenShell>
    </AuthGuard>
  );
}
