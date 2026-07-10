import type { CreateOCRResultPayload, OCRResultRecord } from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createOCREndpoints(client: ApiClient) {
  return {
    list: (params?: { detection_id?: string; search?: string; limit?: number }) =>
      client.get<OCRResultRecord[]>('/api/v1/ocr/results/', { params }),
    get: (ocrId: number) => client.get<OCRResultRecord>(`/api/v1/ocr/results/${ocrId}/`),
    getByDetection: (detectionId: number) =>
      client.get<OCRResultRecord>(`/api/v1/ocr/detections/${detectionId}/`),
    create: (payload: CreateOCRResultPayload) =>
      client.post<OCRResultRecord>('/api/v1/ocr/results/', payload),
  };
}
