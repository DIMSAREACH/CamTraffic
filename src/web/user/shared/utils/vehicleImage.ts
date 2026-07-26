import { getProfileImageUrl } from '@shared/utils/profileImage';

type VehicleImageInput = {
  id: string | number;
  vehicle_type: string;
  model: string;
  registration_photo?: string | null;
};

/** Neutral local SVG — no external stock / Unsplash sample imagery. */
const VEHICLE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="Vehicle">
      <rect width="640" height="400" fill="#e8eef5"/>
      <rect x="120" y="160" width="400" height="120" rx="28" fill="#94a3b8"/>
      <circle cx="200" cy="290" r="36" fill="#64748b"/>
      <circle cx="440" cy="290" r="36" fill="#64748b"/>
      <rect x="200" y="120" width="180" height="50" rx="12" fill="#cbd5e1"/>
    </svg>`,
  );

/** Placeholder when no registration photo is uploaded (production-truth — no stock photos). */
export function getVehicleStockImage(_vehicleType?: string, _seed: string | number = 0): string {
  return VEHICLE_PLACEHOLDER;
}

/** Primary image URL: registration photo from API, else neutral placeholder. */
export function getVehicleImageUrl(vehicle: VehicleImageInput): string {
  const uploaded = getProfileImageUrl(vehicle.registration_photo);
  if (uploaded) return uploaded;
  return getVehicleStockImage(vehicle.vehicle_type, vehicle.id);
}
