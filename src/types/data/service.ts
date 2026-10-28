import type { BasicBranch } from "./branch";
import type { User } from "./user";

export interface BasicServiceTypeResponse {
  id: string;
  name: string;
  icon?: string | null;
}

export interface ServiceImage {
  key: string;
  is_thumbnail: boolean;
  sort_order: number;
}

export type ServiceDiscountType = "percent" | "amount";

export interface Service {
  id: string;
  slug?: string;
  name: string;
  price: number;
  is_active: boolean;
  description: string;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
  service_type?: BasicServiceTypeResponse | null;
  branches?: BasicBranch[];
  images?: ServiceImage[];
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
