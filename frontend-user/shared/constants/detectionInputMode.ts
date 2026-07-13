export type UserDetectionInputMode = 'upload' | 'webcam';

const STORAGE_KEY = 'camtraffic.user.detectionInputMode';

export function getStoredUserDetectionInputMode(): UserDetectionInputMode {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === 'upload' || value === 'webcam') return value;
  } catch {
    /* ignore */
  }
  return 'upload';
}

export function setStoredUserDetectionInputMode(mode: UserDetectionInputMode): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
