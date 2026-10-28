import type { User } from "./user";

export interface Branch {
  id: string;
  name?: string;
  address?: string;
  ward?: string;
  city?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: User;
  updated_by?: User;
}

export interface BasicBranch {
  id: string;
  name: string;
}
