export type AIModelType = 'yolo' | 'custom';

export interface AIModelManagementRecord {
  id: number;
  name: string;
  slug: string;
  model_type: AIModelType;
  description: string;
  is_active: boolean;
  version_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAIModelPayload {
  name: string;
  slug: string;
  model_type: AIModelType;
  description?: string;
  is_active?: boolean;
}

export interface UpdateAIModelPayload {
  name?: string;
  slug?: string;
  model_type?: AIModelType;
  description?: string;
  is_active?: boolean;
}
