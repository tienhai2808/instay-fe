export interface GetDepartmentsRequest {
  view?: string;
  search?: string;
}

export interface UpdateDepartmentRequest {
  name: string;
  phone?: string;
  description?: string;
  permission_ids: string[];
}

export interface CreateDepartmentRequest {
  name: string;
  phone: string;
  description: string;
  permission_ids: string[];
}
