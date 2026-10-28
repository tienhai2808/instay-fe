export type CustomerSortField = "created_at";
export type CustomerSortOrder = "asc" | "desc";
export type CreateCustomerGender = "male" | "female";

export interface CreateCustomerRequest {
  birth_year: number;
  gender: CreateCustomerGender;
  phone: string;
}

export interface GetCustomersRequest {
  page?: number;
  limit?: number;
  sort?: CustomerSortField;
  order?: CustomerSortOrder;
  search?: string;
}

export interface ExportCustomersRequest {
  sort?: CustomerSortField;
  order?: CustomerSortOrder;
}
