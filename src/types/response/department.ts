import { Department, Permission } from "@/types/data/department";

export interface DepartmentsResponseData {
  departments: Department[];
}

export interface DepartmentResponseData {
  department?: Department;
}

export interface PermissionsResponseData {
  permissions: Permission[];
}
