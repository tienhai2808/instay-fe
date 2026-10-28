import axiosRequest from "@/config/axios";
import {
  CreateServiceTypeRequest,
  GetServiceTypesRequest,
  GetServiceTypesWithServicesRequest,
  UpdateServiceTypeRequest,
} from "@/types/request/service_type";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  GuestServiceTypeWithServicesResponseData,
  ServiceTypesResponseData,
  ServiceTypesWithServicesResponseData,
} from "@/types/response/service_type";

export const getServiceTypes = async (params?: GetServiceTypesRequest) => {
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
    ? `/admin/service-types?${queryString}`
    : "/admin/service-types";

  return await axiosRequest.get<ApiResponseEnvelope<ServiceTypesResponseData>>(
    url,
  );
};

export const getGuestServiceTypes = async (params?: GetServiceTypesRequest) => {
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
  const url = queryString ? `/service-types?${queryString}` : "/service-types";

  return await axiosRequest.get<ApiResponseEnvelope<ServiceTypesResponseData>>(
    url,
  );
};

export const createServiceType = async (data: CreateServiceTypeRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/service-types",
    data,
  );
};

export const updateServiceType = async (
  id: string,
  data: UpdateServiceTypeRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/service-types/${id}`,
    data,
  );
};

export const deleteServiceType = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/admin/service-types/${id}`,
  );
};

export const getServiceTypesWithServices = async (
  params?: GetServiceTypesWithServicesRequest,
) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();

  if (search) query.set("search", search);
  if (params?.service_type_id)
    query.set("service_type_id", params.service_type_id);
  if (params?.branch_id) query.set("branch_id", params.branch_id);

  const queryString = query.toString();
  const url = queryString
    ? `/admin/service-types/services?${queryString}`
    : "/admin/service-types/services";

  return await axiosRequest.get<
    ApiResponseEnvelope<ServiceTypesWithServicesResponseData>
  >(url);
};

export const getGuestServiceTypeServicesBySlug = async (slug: string) => {
  const safeSlug = encodeURIComponent(slug.trim());
  return await axiosRequest.get<
    ApiResponseEnvelope<GuestServiceTypeWithServicesResponseData>
  >(`/service-types/${safeSlug}/services?include=service_type`);
};
