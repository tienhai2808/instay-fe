export interface GetServiceTypesRequest {
  view?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  department_id?: string;
}

export interface GetServiceTypesWithServicesRequest {
  search?: string;
  service_type_id?: string;
  branch_id?: string;
}

export interface CreateServiceTypeRequest {
  name: string;
  department_id: string;
  icon: string;
}

export interface UpdateServiceTypeRequest {
  name: string;
  department_id: string;
  icon: string;
}
