import { User } from "./user";
import type { BasicBranch } from "./branch";

export interface BasicFloorResponse {
  id: string;
  name: string;
  branch?: BasicBranch | null;
}

export interface Floor extends BasicFloorResponse {
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
