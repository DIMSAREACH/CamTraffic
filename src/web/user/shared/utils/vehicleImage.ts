import { getProfileImageUrl } from '@shared/utils/profileImage';

type VehicleImageInput = {
  id: string | number;
  vehicle_type: string;
  model: string;
  registration_photo?: string | null;
};

/** Local SVG fallback when remote stock photos fail to load. */
export const VEHICLE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Vehicle">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dbeafe"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#cbd5e1"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="url(#sky)"/>
      <ellipse cx="480" cy="430" rx="320" ry="28" fill="#94a3b8" opacity="0.35"/>
      <path d="M190 340 h580 c28 0 48-18 52-42 l18-110 c6-36-14-66-50-72 H520 l-70-70 c-14-14-34-22-54-22 H360 c-22 0-42 10-54 28 l-52 64 H230 c-40 0-68 30-62 68 l16 94 c6 28 28 48 56 48z" fill="url(#body)" stroke="#64748b" stroke-width="4"/>
      <rect x="360" y="210" width="120" height="70" rx="10" fill="#93c5fd" opacity="0.85"/>
      <rect x="500" y="210" width="150" height="70" rx="10" fill="#93c5fd" opacity="0.75"/>
      <circle cx="310" cy="350" r="48" fill="#1e293b"/>
      <circle cx="310" cy="350" r="24" fill="#94a3b8"/>
      <circle cx="670" cy="350" r="48" fill="#1e293b"/>
      <circle cx="670" cy="350" r="24" fill="#94a3b8"/>
    </svg>`,
  );

const VEHICLE_STOCK: Record<string, readonly string[]> = {
  car: [
    'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1494976688708-9ea4e3459915?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c50d8c?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=960&q=80',
  ],
  motorcycle: [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1449426468159-d96dbf50f19f?auto=format&fit=crop&w=960&q=80',
  ],
  truck: [
    'https://images.unsplash.com/photo-1601584111747-47ecc7a7f123?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1519003729244-7d7c72490f0e?auto=format&fit=crop&w=960&q=80',
  ],
  bus: [
    'https://images.unsplash.com/photo-1570125909232-eb263c3f8216?auto=format&fit=crop&w=960&q=80',
    'https://images.unsplash.com/photo-1544620301-c513d4c4c4b0?auto=format&fit=crop&w=960&q=80',
  ],
  'tuk-tuk': [
    'https://images.unsplash.com/photo-1593618998160-c09764eb9961?auto=format&fit=crop&w=960&q=80',
  ],
};

const DEFAULT_STOCK = VEHICLE_STOCK.car;

/** Prefer model-specific stock when the name is distinctive (e.g. white Prius). */
const MODEL_STOCK: Array<{ match: RegExp; url: string }> = [
  {
    match: /prius/i,
    url: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=960&q=80',
  },
  {
    match: /camry|vios|corolla|accent|morning|cr-?v/i,
    url: 'https://images.unsplash.com/photo-1494976688708-9ea4e3459915?auto=format&fit=crop&w=960&q=80',
  },
];

function seedToIndex(seed: string | number, length: number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return Math.abs(seed) % length;
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % length;
}

/** Neutral local illustration — last-resort when remote images fail. */
export function getVehiclePlaceholderImage(): string {
  return VEHICLE_PLACEHOLDER;
}

/** Stock photo for a vehicle type (used when no registration photo is uploaded). */
export function getVehicleStockImage(vehicleType: string, seed: string | number = 0, model?: string): string {
  if (model) {
    const hit = MODEL_STOCK.find((entry) => entry.match.test(model));
    if (hit) return hit.url;
  }
  const pool = VEHICLE_STOCK[vehicleType] ?? DEFAULT_STOCK;
  return pool[seedToIndex(seed, pool.length)];
}

/** Primary image URL: registration photo from API, else type/model stock image. */
export function getVehicleImageUrl(vehicle: VehicleImageInput): string {
  const uploaded = getProfileImageUrl(vehicle.registration_photo);
  if (uploaded) return uploaded;
  return getVehicleStockImage(vehicle.vehicle_type, vehicle.id, vehicle.model);
}
