import axiosRequest from "@/config/axios";
import {
  GetDepartmentsRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
} from "@/types/request/department";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  DepartmentsResponseData,
  DepartmentResponseData,
  PermissionsResponseData,
} from "@/types/response/department";
import { Department, Permission } from "@/types/data/department";

export const getDepartments = async (params?: GetDepartmentsRequest) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();

  if (view) query.set("view", view);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString
    ? `/admin/departments?${queryString}`
    : "/admin/departments";

  return await axiosRequest.get<ApiResponseEnvelope<DepartmentsResponseData>>(
    url,
  );
};

export const createDepartment = async (data: CreateDepartmentRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/departments",
    data,
  );
};

export const updateDepartment = async (
  departmentId: string,
  data: UpdateDepartmentRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/departments/${departmentId}`,
    data,
  );
};

export const deleteDepartment = async (departmentId: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/admin/departments/${departmentId}`,
  );
};

export const getDepartmentPermission = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<PermissionsResponseData | Permission[]>
  >("/permissions");
};

export const getDepartmentByName = async (departmentName: string) => {
  return await getDepartmentByIdentifier(departmentName);
};

export const getDepartmentByIdentifier = async (identifier: string) => {
  const safeIdentifier = encodeURIComponent(identifier.trim());

  return await axiosRequest.get<
    ApiResponseEnvelope<DepartmentResponseData | Department>
  >(`/departments/${safeIdentifier}`);
};
