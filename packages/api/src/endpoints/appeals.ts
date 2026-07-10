import type {
  CreateDriverAppealPayload,
  DriverAppealDetail,
  DriverAppealRecord,
  DriverAppealableViolationRecord,
  OfficerAppealDecisionPayload,
  OfficerAppealDetail,
  OfficerAppealRecord,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createAppealsEndpoints(client: ApiClient) {
  return {
    driver: {
      listAppealable: () =>
        client.get<DriverAppealableViolationRecord[]>('/api/v1/appeals/driver/appealable/'),
      list: (params?: { status?: string; search?: string; limit?: number }) =>
        client.get<DriverAppealRecord[]>('/api/v1/appeals/driver/mine/', { params }),
      get: (appealId: number) => client.get<DriverAppealDetail>(`/api/v1/appeals/driver/mine/${appealId}/`),
      create: (payload: CreateDriverAppealPayload) => {
        const formData = new FormData();
        formData.append('violation_id', String(payload.violation_id));
        formData.append('reason', payload.reason);
        if (payload.evidence) {
          formData.append('evidence', payload.evidence);
        }
        return client.post<DriverAppealDetail>('/api/v1/appeals/driver/mine/', formData);
      },
    },
    officer: {
      list: (params?: { status?: string; search?: string; limit?: number }) =>
        client.get<OfficerAppealRecord[]>('/api/v1/appeals/officer/review/', { params }),
      get: (appealId: number) =>
        client.get<OfficerAppealDetail>(`/api/v1/appeals/officer/review/${appealId}/`),
      decide: (appealId: number, payload: OfficerAppealDecisionPayload) =>
        client.post<OfficerAppealDetail>(`/api/v1/appeals/officer/review/${appealId}/decision/`, payload),
    },
  };
}
