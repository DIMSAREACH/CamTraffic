export interface PermissionManagementRecord {
  id: number;
  codename: string;
  name: string;
  module: string;
  description: string;
}

export interface CreatePermissionPayload {
  codename: string;
  name: string;
  module: string;
  description?: string;
}

export interface UpdatePermissionPayload {
  codename?: string;
  name?: string;
  module?: string;
  description?: string;
}
