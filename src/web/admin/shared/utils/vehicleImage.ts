import { getProfileImageUrl } from '@shared/utils/profileImage';

type VehicleImageInput = {
  id: string | number;
  vehicle_type: string;
  model: string;
  registration_photo?: string | null;
};

function svgDataUri(svg: string): string {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Type-specific local SVG when no registration photo is uploaded. */
export function getVehicleStockImage(vehicleType?: string, _seed: string | number = 0): string {
  const type = (vehicleType || 'car').toLowerCase();
  if (type === 'motorcycle') {
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#eef2ff"/>
      <circle cx="180" cy="280" r="48" fill="#475569"/>
      <circle cx="460" cy="280" r="48" fill="#475569"/>
      <path d="M160 250 L280 160 L360 160 L460 250 Z" fill="#f59e0b"/>
      <rect x="270" y="145" width="90" height="28" rx="8" fill="#d97706"/>
    </svg>`);
  }
  if (type === 'truck') {
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#f1f5f9"/>
      <rect x="60" y="150" width="150" height="130" rx="16" fill="#64748b"/>
      <rect x="200" y="120" width="360" height="160" rx="12" fill="#475569"/>
      <circle cx="140" cy="300" r="34" fill="#1e293b"/><circle cx="300" cy="300" r="34" fill="#1e293b"/>
      <circle cx="460" cy="300" r="34" fill="#1e293b"/>
    </svg>`);
  }
  if (type === 'bus') {
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#f5f3ff"/>
      <rect x="70" y="110" width="500" height="170" rx="22" fill="#7c3aed"/>
      <rect x="100" y="135" width="70" height="55" rx="8" fill="#c4b5fd"/>
      <rect x="190" y="135" width="70" height="55" rx="8" fill="#c4b5fd"/>
      <rect x="280" y="135" width="70" height="55" rx="8" fill="#c4b5fd"/>
      <circle cx="160" cy="300" r="36" fill="#1e293b"/><circle cx="480" cy="300" r="36" fill="#1e293b"/>
    </svg>`);
  }
  if (type === 'tuk-tuk') {
    return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#ecfdf5"/>
      <rect x="170" y="150" width="300" height="120" rx="24" fill="#10b981"/>
      <rect x="210" y="105" width="220" height="55" rx="14" fill="#059669"/>
      <circle cx="220" cy="290" r="40" fill="#1e293b"/><circle cx="420" cy="290" r="40" fill="#1e293b"/>
    </svg>`);
  }
  return svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="Vehicle">
      <rect width="640" height="400" fill="#e8eef5"/>
      <rect x="120" y="160" width="400" height="120" rx="28" fill="#94a3b8"/>
      <circle cx="200" cy="290" r="36" fill="#64748b"/>
      <circle cx="440" cy="290" r="36" fill="#64748b"/>
      <rect x="200" y="120" width="180" height="50" rx="12" fill="#cbd5e1"/>
    </svg>`);
}

/** Primary image URL: registration photo from API, else type-specific placeholder. */
export function getVehicleImageUrl(vehicle: VehicleImageInput): string {
  const uploaded = getProfileImageUrl(vehicle.registration_photo);
  if (uploaded) return uploaded;
  return getVehicleStockImage(vehicle.vehicle_type, vehicle.id);
}
