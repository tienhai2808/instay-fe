import type { Department } from "./department";
import type { User } from "./user";

export interface SupportCategory {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
  department?: Department | null;
  support_tickets_count?: number;
}
