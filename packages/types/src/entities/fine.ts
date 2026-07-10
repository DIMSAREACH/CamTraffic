export type FineStatus = 'unpaid' | 'paid' | 'overdue' | 'waived';

export interface Fine {
  id: string;
  violation_id: string;
  amount: number;
  currency: string;
  status: FineStatus;
  due_date: string;
  paid_at?: string;
}
