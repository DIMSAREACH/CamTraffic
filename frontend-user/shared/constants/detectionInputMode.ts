import type { EnterpriseInputMode } from '@shared/components/ai/center/EnterpriseDetectionInputWorkspace';

export type UserDetectionInputMode = EnterpriseInputMode;

const STORAGE_KEY = 'camtraffic.user.detectionInputMode';

const MODES: EnterpriseInputMode[] = ['image', 'video', 'camera', 'webcam'];

export function getStoredUserDetectionInputMode(): UserDetectionInputMode {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === 'upload') return 'image';
    if (value && MODES.includes(value as EnterpriseInputMode)) {
      return value as EnterpriseInputMode;
    }
  } catch {
    /* ignore */
  }
  return 'image';
}

export function setStoredUserDetectionInputMode(mode: UserDetectionInputMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
