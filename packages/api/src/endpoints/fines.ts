import type {
  DriverFineDetail,
  DriverFinePaymentHistoryDetail,
  DriverFinePaymentHistoryRecord,
  DriverFinePaymentPayload,
  DriverFinePaymentResult,
  DriverFineRecord,
} from '@camtraffic/types';
import type { ApiClient } from '../client';

export function createFinesEndpoints(client: ApiClient) {
  return {
    driver: {
      list: (params?: { status?: string; search?: string; limit?: number }) =>
        client.get<DriverFineRecord[]>('/api/v1/fines/driver/mine/', { params }),
      get: (fineId: number) => client.get<DriverFineDetail>(`/api/v1/fines/driver/mine/${fineId}/`),
      pay: (fineId: number, payload: DriverFinePaymentPayload) =>
        client.post<DriverFinePaymentResult>(`/api/v1/fines/driver/mine/${fineId}/pay/`, payload),
      listPayments: (params?: { method?: string; search?: string; limit?: number }) =>
        client.get<DriverFinePaymentHistoryRecord[]>('/api/v1/fines/driver/payments/', { params }),
      getPayment: (paymentId: number) =>
        client.get<DriverFinePaymentHistoryDetail>(`/api/v1/fines/driver/payments/${paymentId}/`),
    },
  };
}
