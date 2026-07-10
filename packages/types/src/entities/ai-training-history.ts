export type AITrainingStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface AITrainingHistoryRecord {
  id: number;
  model_version_id: number;
  model_id: number;
  model_name: string;
  model_slug: string;
  version_label: string;
  status: AITrainingStatus;
  dataset_name: string;
  epochs: number;
  batch_size: number;
  learning_rate: number | null;
  final_accuracy: number | null;
  final_loss: number | null;
  started_at: string;
  completed_at: string | null;
  log_summary: string;
  triggered_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAITrainingHistoryPayload {
  model_version_id: number;
  status?: AITrainingStatus;
  dataset_name: string;
  epochs?: number;
  batch_size?: number;
  learning_rate?: number | null;
  final_accuracy?: number | null;
  final_loss?: number | null;
  started_at?: string;
  completed_at?: string | null;
  log_summary?: string;
}

export interface UpdateAITrainingHistoryPayload {
  status?: AITrainingStatus;
  dataset_name?: string;
  epochs?: number;
  batch_size?: number;
  learning_rate?: number | null;
  final_accuracy?: number | null;
  final_loss?: number | null;
  started_at?: string;
  completed_at?: string | null;
  log_summary?: string;
}
