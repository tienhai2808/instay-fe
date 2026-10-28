import axiosRequest from "@/config/axios";
import type {
  CreateSupportCategoryRequest,
  GetSupportCategoriesRequest,
  UpdateSupportCategoryRequest,
} from "@/types/request/support_category";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type { SupportCategoriesResponseData } from "@/types/response/support_category";

export const getSupportCategories = async (
  params?: GetSupportCategoriesRequest,
) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (view) query.set("view", view);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.department_id) query.set("department_id", params.department_id);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString
    ? `/admin/support-categories?${queryString}`
    : "/admin/support-categories";

  return await axiosRequest.get<
    ApiResponseEnvelope<SupportCategoriesResponseData>
  >(url);
};

export const getGuestSupportCategories = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<SupportCategoriesResponseData>
  >("/support-categories");
};

export const createSupportCategory = async (
  data: CreateSupportCategoryRequest,
) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/support-categories",
    data,
  );
};

export const updateSupportCategory = async (
  id: string,
  data: UpdateSupportCategoryRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/support-categories/${id}`,
    data,
  );
};

export const deleteSupportCategory = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/admin/support-categories/${id}`,
  );
};
