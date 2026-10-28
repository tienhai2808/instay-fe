import type { User } from "./user";

export interface BasicPricingTagResponse {
  id: number;
  name: string;
}

export interface PricingTag extends BasicPricingTagResponse {
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
