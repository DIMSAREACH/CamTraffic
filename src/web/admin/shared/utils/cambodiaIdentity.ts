/**
 * Cambodia identity formats — keep in sync with backend core/cambodia_identity.py
 *
 * License and plate share one numbered form: 2TE-1507 (NLL-NNNN)
 * Leading digits are the province registration code (1–25).
 */

export const PLATE_FORMAT_LABEL = 'NLL-NNNN';
export const PLATE_FORMAT_EXAMPLE = '2TE-1507';
export const PLATE_FORMAT_REGEX = /^[1-9]\d?[A-Z]{1,2}-\d{4}$/;

/** License follows plate number form across all modules. */
export const LICENSE_FORMAT_LABEL = PLATE_FORMAT_LABEL;
export const LICENSE_FORMAT_EXAMPLE = PLATE_FORMAT_EXAMPLE;
export const LICENSE_FORMAT_REGEX = PLATE_FORMAT_REGEX;

/** Official Cambodia plate province codes (1–25). */
export const CAMBODIA_PROVINCE_CODES = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25',
]);

export const DEFAULT_VEHICLE_IDENTITY_CONFIG = {
  plate_format: PLATE_FORMAT_LABEL,
  plate_format_example: PLATE_FORMAT_EXAMPLE,
  license_format: LICENSE_FORMAT_LABEL,
  license_format_example: LICENSE_FORMAT_EXAMPLE,
};

/** Normalize to dashed Cambodia private plate / license: 2TE-1507 */
export function formatCambodiaPlate(raw: string): string {
  const cleaned = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return '';
  const m = cleaned.match(/^(\d{1,2})([A-Z]{0,2})(\d{0,4})$/);
  if (m) {
    const [, dig, letters, nums] = m;
    if (!letters && !nums) return dig;
    if (!nums) return `${dig}${letters}`;
    return `${dig}${letters}-${nums}`;
  }
  if (cleaned.length > 4) {
    return `${cleaned.slice(0, -4)}-${cleaned.slice(-4)}`;
  }
  return cleaned;
}

export function isValidCambodiaPlate(plate: string): boolean {
  return PLATE_FORMAT_REGEX.test(formatCambodiaPlate(plate));
}

/**
 * Infer province code from plate leading digits.
 * Prefers 2-digit codes (12 = Phnom Penh) over 1-digit when both match.
 * Example: 2TE-1507 → "2" (Battambang); 12AA-1234 → "12" (Phnom Penh).
 */
export function inferProvinceCodeFromPlate(raw: string): string | null {
  const cleaned = (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!cleaned) return null;
  const m = cleaned.match(/^(\d{1,2})/);
  if (!m) return null;
  const digits = m[1];
  if (digits.length >= 2 && CAMBODIA_PROVINCE_CODES.has(digits.slice(0, 2))) {
    return digits.slice(0, 2);
  }
  if (CAMBODIA_PROVINCE_CODES.has(digits[0])) {
    return digits[0];
  }
  return null;
}

/** License uses the same numbered form as plates. */
export function formatCambodiaLicense(raw: string): string {
  return formatCambodiaPlate(raw);
}

export function isValidCambodiaLicense(license: string): boolean {
  return isValidCambodiaPlate(license);
}
