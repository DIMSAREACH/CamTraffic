import { getProfileImageUrl } from '@shared/utils/profileImage';

type VehicleImageInput = {
  id: number;
  vehicle_type: string;
  model: string;
  registration_photo?: string | null;
};

const VEHICLE_STOCK: Record<string, readonly string[]> = {
  car: [
    'https://images.unsplash.com/photo-1494976688708-9ea4e3459915?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1583121274602-3e2820c50d8c?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=640&q=80',
  ],
  motorcycle: [
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1449426468159-d96dbf50f19f?auto=format&fit=crop&w=640&q=80',
  ],
  truck: [
    'https://images.unsplash.com/photo-1601584111747-47ecc7a7f123?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1519003729244-7d7c72490f0e?auto=format&fit=crop&w=640&q=80',
  ],
  bus: [
    'https://images.unsplash.com/photo-1570125909232-eb263c3f8216?auto=format&fit=crop&w=640&q=80',
    'https://images.unsplash.com/photo-1544620301-c513d4c4c4b0?auto=format&fit=crop&w=640&q=80',
  ],
  'tuk-tuk': [
    'https://images.unsplash.com/photo-1593618998160-c09764eb9961?auto=format&fit=crop&w=640&q=80',
  ],
};

const DEFAULT_STOCK = VEHICLE_STOCK.car;

/** Stock photo for a vehicle type (used when no registration photo is uploaded). */
export function getVehicleStockImage(vehicleType: string, seed = 0): string {
  const pool = VEHICLE_STOCK[vehicleType] ?? DEFAULT_STOCK;
  return pool[Math.abs(seed) % pool.length];
}

/** Primary image URL: registration photo from API, else type stock image. */
export function getVehicleImageUrl(vehicle: VehicleImageInput): string {
  const uploaded = getProfileImageUrl(vehicle.registration_photo);
  if (uploaded) return uploaded;
  return getVehicleStockImage(vehicle.vehicle_type, vehicle.id);
}
