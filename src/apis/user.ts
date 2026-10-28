import axiosRequest from "@/config/axios";
import {
  CreateUserRequest,
  GetUsersRequest,
  ResetUserPasswordRequest,
  UpdateUserRequest,
} from "@/types/request/user";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CreateUserResponseData,
  UserDetailResponseData,
  UsersResponseData,
} from "@/types/response/user";

export const getUsers = async (params?: GetUsersRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.role) query.set("role", params.role);
  if (params?.department_id != null)
    query.set("department_id", String(params.department_id));
  if (params?.branch_id != null)
    query.set("branch_id", String(params.branch_id));
  if (params?.is_active != null)
    query.set("is_active", String(params.is_active));
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/users?${queryString}` : "/users";

  return await axiosRequest.get<ApiResponseEnvelope<UsersResponseData>>(url);
};

export const deleteUser = async (userId: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/users/${userId}`,
  );
};

export const deleteUsers = async (ids: string[]) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>("/users", {
    data: { ids },
  });
};

export const createUser = async (data: CreateUserRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<CreateUserResponseData>>(
    "/users",
    data,
  );
};

export const getUserById = async (userId: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<UserDetailResponseData>>(
    `/users/${userId}`,
  );
};

export const updateUser = async (userId: string, data: UpdateUserRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/users/${userId}`,
    data,
  );
};

export const resetUserPassword = async (
  userId: string,
  data: ResetUserPasswordRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/users/${userId}/password`,
    data,
  );
};
