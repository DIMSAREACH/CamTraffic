import { downloadBlob } from '@shared/utils/webcamFrame';

/** Fetch a media URL (e.g. Django /media) and save as a file. */
export async function downloadMediaUrl(url: string, filename: string): Promise<void> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  downloadBlob(blob, filename);
}
