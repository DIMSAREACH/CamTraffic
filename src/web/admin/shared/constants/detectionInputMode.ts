import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';

const STORAGE_KEY = 'camtraffic.admin.detectionInputMode';

const MODES: EnterpriseInputMode[] = ['image', 'video', 'camera', 'webcam'];

export function getStoredAdminDetectionInputMode(): EnterpriseInputMode {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value && MODES.includes(value as EnterpriseInputMode)) {
      return value as EnterpriseInputMode;
    }
  } catch {
    /* ignore */
  }
  return 'image';
}

export function setStoredAdminDetectionInputMode(mode: EnterpriseInputMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
