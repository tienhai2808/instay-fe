export type UserRole = "admin" | "staff";

export interface GetUsersRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  role?: UserRole;
  department_id?: string;
  branch_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  is_active?: boolean;
  department_id?: string | null;
  branch_ids?: string[];
  avatar?: string | null;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  is_active: boolean;
  first_name: string;
  last_name: string;
  department_id?: string | null;
  branch_ids?: string[];
  avatar?: string | null;
}

export interface ResetUserPasswordRequest {
  new_password: string;
}
