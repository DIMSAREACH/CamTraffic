import type {
  AIModelManagementRecord,
  AIModelVersionRecord,
  AITrainingHistoryRecord,
  CreateAIModelPayload,
  CreateAIModelVersionPayload,
  CreateAITrainingHistoryPayload,
  UpdateAIModelPayload,
  UpdateAIModelVersionPayload,
  UpdateAITrainingHistoryPayload,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createAiModelsEndpoints(client: ApiClient) {
  return {
    list: (params?: { search?: string; model_type?: string }) =>
      client.get<AIModelManagementRecord[]>('/api/v1/ai-models/management/', { params }),
    create: (payload: CreateAIModelPayload) =>
      client.post<AIModelManagementRecord>('/api/v1/ai-models/management/', payload),
    update: (modelId: number, payload: UpdateAIModelPayload) =>
      client.patch<AIModelManagementRecord>(`/api/v1/ai-models/management/${modelId}/`, payload),
    delete: (modelId: number) => client.delete<null>(`/api/v1/ai-models/management/${modelId}/`),
    listVersions: (params?: { model_id?: string; status?: string }) =>
      client.get<AIModelVersionRecord[]>('/api/v1/ai-models/versions/', { params }),
    createVersion: (payload: CreateAIModelVersionPayload) =>
      client.post<AIModelVersionRecord>('/api/v1/ai-models/versions/', payload),
    updateVersion: (versionId: number, payload: UpdateAIModelVersionPayload) =>
      client.patch<AIModelVersionRecord>(`/api/v1/ai-models/versions/${versionId}/`, payload),
    deleteVersion: (versionId: number) => client.delete<null>(`/api/v1/ai-models/versions/${versionId}/`),
    activateVersion: (versionId: number) =>
      client.post<AIModelVersionRecord>(`/api/v1/ai-models/versions/${versionId}/activate/`),
    listTrainingHistory: (params?: { model_id?: string; version_id?: string; status?: string }) =>
      client.get<AITrainingHistoryRecord[]>('/api/v1/ai-models/training-history/', { params }),
    createTrainingHistory: (payload: CreateAITrainingHistoryPayload) =>
      client.post<AITrainingHistoryRecord>('/api/v1/ai-models/training-history/', payload),
    updateTrainingHistory: (recordId: number, payload: UpdateAITrainingHistoryPayload) =>
      client.patch<AITrainingHistoryRecord>(`/api/v1/ai-models/training-history/${recordId}/`, payload),
    deleteTrainingHistory: (recordId: number) =>
      client.delete<null>(`/api/v1/ai-models/training-history/${recordId}/`),
  };
}
