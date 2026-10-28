export interface GetSupportCategoriesRequest {
  view?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  department_id?: string;
}

export interface CreateSupportCategoryRequest {
  name: string;
  department_id: string;
}

export interface UpdateSupportCategoryRequest {
  name: string;
  department_id: string;
}
