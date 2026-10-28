import type { BasicBranch } from "./branch";
import type { Department } from "./department";
import type { ServiceDiscountType } from "./service";
import type { User } from "./user";

export interface ServiceType {
  id: string;
  name: string;
  slug?: string;
  icon?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
  department?: Department | null;
  service_count?: number;
}

export interface ServiceTypeServiceThumbnail {
  id: string;
  key: string;
}

export interface ServiceTypeService {
  id: string;
  slug?: string;
  name: string;
  price: number;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
  thumbnail?: ServiceTypeServiceThumbnail | null;
  branches?: BasicBranch[];
}

export interface ServiceTypeWithServices extends ServiceType {
  services?: ServiceTypeService[];
}
