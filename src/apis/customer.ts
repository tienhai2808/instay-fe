import axiosRequest from "@/config/axios";
import type {
  CreateCustomerRequest,
  ExportCustomersRequest,
  GetCustomersRequest,
} from "@/types/request/customer";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type { CustomersResponseData } from "@/types/response/customer";

export const getCustomers = async (params?: GetCustomersRequest) => {
  const query = new URLSearchParams();
  const sort = params?.sort?.trim();
  const search = params?.search?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString
    ? `/admin/customers?${queryString}`
    : "/admin/customers";

  return await axiosRequest.get<ApiResponseEnvelope<CustomersResponseData>>(
    url,
  );
};

export const exportCustomers = async (payload?: ExportCustomersRequest) => {
  return await axiosRequest.post<Blob>(
    "/admin/customers/export",
    payload || {},
    {
      responseType: "blob",
    },
  );
};

export const createCustomer = async (payload: CreateCustomerRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/customers",
    payload,
  );
};
