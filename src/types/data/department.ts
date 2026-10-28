import { User } from "./user";

export interface Department {
  id: string;
  name?: string;
  phone?: string;
  description?: string;
  users_count?: number;
  permissions?: Permission[];
  created_by?: User;
  updated_by?: User;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  display_name_vi: string;
  display_name_en: string;
  name: string;
}
