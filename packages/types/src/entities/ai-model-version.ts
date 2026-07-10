export type AIModelVersionStatus = 'training' | 'ready' | 'deprecated' | 'failed';

export interface AIModelVersionRecord {
  id: number;
  model_id: number;
  model_name: string;
  model_slug: string;
  version: string;
  weights_path: string;
  status: AIModelVersionStatus;
  accuracy: number | null;
  trained_at: string | null;
  is_active: boolean;
  training_notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAIModelVersionPayload {
  model_id: number;
  version: string;
  weights_path: string;
  status?: AIModelVersionStatus;
  accuracy?: number | null;
  trained_at?: string | null;
  is_active?: boolean;
  training_notes?: string;
}

export interface UpdateAIModelVersionPayload {
  version?: string;
  weights_path?: string;
  status?: AIModelVersionStatus;
  accuracy?: number | null;
  trained_at?: string | null;
  is_active?: boolean;
  training_notes?: string;
}
