import axiosRequest from "@/config/axios";
import type {
  CreateOrderServiceForAdminRequest,
  CreateOrderServiceForGuestRequest,
  GetOrderServicesRequest,
  UpdateOrderServiceStatusForAdminRequest,
  UpdateOrderServiceStatusForGuestRequest,
} from "@/types/request/order_service";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  OrderServiceResponseData,
  OrderServicesResponseData,
} from "@/types/response/order_service";

const buildOrderServicesQueryString = (params?: GetOrderServicesRequest) => {
  const query = new URLSearchParams();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (params?.status) query.set("status", params.status);

  return query.toString();
};

export const getOrderServices = async (params?: GetOrderServicesRequest) => {
  const queryString = buildOrderServicesQueryString(params);
  const url = queryString
    ? `/admin/order-services?${queryString}`
    : "/admin/order-services";

  return await axiosRequest.get<ApiResponseEnvelope<OrderServicesResponseData>>(
    url,
  );
};

export const getOrderServicesForGuest = async (
  params?: GetOrderServicesRequest,
) => {
  const queryString = buildOrderServicesQueryString(params);
  const url = queryString
    ? `/order-services?${queryString}`
    : "/order-services";

  return await axiosRequest.get<ApiResponseEnvelope<OrderServicesResponseData>>(
    url,
  );
};

export const getOrderServiceById = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<OrderServiceResponseData>>(
    `/admin/order-services/${id}`,
  );
};

export const createOrderServiceForAdmin = async (
  payload: CreateOrderServiceForAdminRequest,
) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/order-services",
    payload,
  );
};

export const createOrderServiceForGuest = async (
  payload: CreateOrderServiceForGuestRequest,
) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/order-services",
    payload,
  );
};

export const updateOrderServiceStatusForAdmin = async (
  id: string,
  payload: UpdateOrderServiceStatusForAdminRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/order-services/${id}/status`,
    payload,
  );
};

export const updateOrderServiceStatusForGuest = async (
  id: string,
  payload: UpdateOrderServiceStatusForGuestRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/order-services/${id}/status`,
    payload,
  );
};
