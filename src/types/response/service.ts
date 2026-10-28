import { Service } from "@/types/data/service";
import type { BasicBranch } from "@/types/data/branch";
import { PaginationMeta } from "./meta";

export interface ServicesResponseData {
  services?: Service[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface GuestServiceThumbnail {
  id: string;
  key: string;
}

export interface GuestServiceSummary {
  id: string;
  slug?: string;
  name: string;
  price: number;
  discount_type?: "percent" | "amount" | null;
  discount_value?: number | null;
  discount_start_at?: string | null;
  discount_end_at?: string | null;
  thumbnail?: GuestServiceThumbnail | null;
  branches?: BasicBranch[];
}

export interface GuestServicesResponseData {
  services?: GuestServiceSummary[];
  meta?: PaginationMeta;
}

export interface ServiceResponseData {
  service?: Service;
}

export interface CreateServiceResponseData {
  id?: string;
}
