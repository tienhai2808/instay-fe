import type { Department } from "./department";
import type { BasicBranch } from "./branch";

export interface User {
  id: string;
  username?: string;
  email?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  updated_at?: string;
  department?: Department;
  branches?: BasicBranch[];
  avatar?: string | null;
  created_by?: User;
  updated_by?: User;
}
