import type {
  DriverViolationDetail,
  DriverViolationRecord,
  OfficerViolationDecisionPayload,
  OfficerViolationDecisionResult,
  OfficerViolationReviewDetail,
  OfficerViolationReviewRecord,
  OfficerEvidenceDetail,
  OfficerEvidenceRecord,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createViolationsEndpoints(client: ApiClient) {
  return {
    officer: {
      listReview: (params?: { status?: string; search?: string; limit?: number }) =>
        client.get<OfficerViolationReviewRecord[]>('/api/v1/violations/officer/review/', { params }),
      getReview: (violationId: number) =>
        client.get<OfficerViolationReviewDetail>(`/api/v1/violations/officer/review/${violationId}/`),
      decide: (violationId: number, payload: OfficerViolationDecisionPayload) =>
        client.post<OfficerViolationDecisionResult>(
          `/api/v1/violations/officer/review/${violationId}/decision/`,
          payload,
        ),
      listEvidence: (params?: { status?: string; search?: string; camera_id?: string; has_evidence?: string; limit?: number }) =>
        client.get<OfficerEvidenceRecord[]>('/api/v1/violations/officer/evidence/', { params }),
      getEvidence: (violationId: number) =>
        client.get<OfficerEvidenceDetail>(`/api/v1/violations/officer/evidence/${violationId}/`),
    },
    driver: {
      list: (params?: { status?: string; search?: string; limit?: number }) =>
        client.get<DriverViolationRecord[]>('/api/v1/violations/driver/mine/', { params }),
      get: (violationId: number) =>
        client.get<DriverViolationDetail>(`/api/v1/violations/driver/mine/${violationId}/`),
    },
  };
}
