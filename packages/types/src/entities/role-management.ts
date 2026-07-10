export interface RoleManagementRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
}

export interface CreateRolePayload {
  name: string;
  slug: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}
