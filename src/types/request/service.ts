export interface GetServicesRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  service_type_id?: string;
  branch_id?: string;
  is_active?: boolean;
  has_discount?: boolean;
}

export interface ServiceImagePayload {
  key: string;
  is_thumbnail: boolean;
  sort_order: number;
}

export type ServiceDiscountType = "percent" | "amount";

export interface ServicePayload {
  name: string;
  service_type_id: string;
  price: number;
  is_active: boolean;
  description: string;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
  branch_ids: string[];
  images: ServiceImagePayload[];
}

export type CreateServiceRequest = ServicePayload;
export type UpdateServiceRequest = ServicePayload;
