import axiosRequest from "@/config/axios";
import {
  CreateServiceRequest,
  GetServicesRequest,
  UpdateServiceRequest,
} from "@/types/request/service";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  GuestServicesResponseData,
  ServiceResponseData,
  ServicesResponseData,
} from "@/types/response/service";

export const getServices = async (params?: GetServicesRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.service_type_id)
    query.set("service_type_id", params.service_type_id);
  if (params?.branch_id) query.set("branch_id", params.branch_id);
  if (params?.is_active != null)
    query.set("is_active", String(params.is_active));
  if (params?.has_discount != null)
    query.set("has_discount", String(params.has_discount));
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString
    ? `/admin/services?${queryString}`
    : "/admin/services";

  return await axiosRequest.get<ApiResponseEnvelope<ServicesResponseData>>(url);
};

export const getGuestServices = async (params?: GetServicesRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.service_type_id)
    query.set("service_type_id", params.service_type_id);
  if (params?.branch_id) query.set("branch_id", params.branch_id);
  if (params?.is_active != null)
    query.set("is_active", String(params.is_active));
  if (params?.has_discount != null)
    query.set("has_discount", String(params.has_discount));
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/services?${queryString}` : "/services";

  return await axiosRequest.get<ApiResponseEnvelope<GuestServicesResponseData>>(
    url,
  );
};

export const getGuestServiceBySlug = async (slug: string) => {
  const safeSlug = encodeURIComponent(slug.trim());
  return await axiosRequest.get<ApiResponseEnvelope<ServiceResponseData>>(
    `/services/${safeSlug}`,
  );
};

export const getServiceById = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<ServiceResponseData>>(
    `/admin/services/${id}`,
  );
};

export const createService = async (data: CreateServiceRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/services",
    data,
  );
};

export const updateService = async (id: string, data: UpdateServiceRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/services/${id}`,
    data,
  );
};

export const deleteService = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/admin/services/${id}`,
  );
};

export const deleteServices = async (ids: string[]) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    "/admin/services",
    {
      data: { ids },
    },
  );
};
