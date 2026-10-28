import type { User } from "./user";

export interface BasicSourceResponse {
  id: string;
  name: string;
}

export interface Source extends BasicSourceResponse {
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
