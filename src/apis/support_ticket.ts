import axiosRequest from "@/config/axios";
import type {
  CreateSupportTicketForGuestRequest,
  GetSupportTicketsRequest,
  UpdateSupportTicketStatusForAdminRequest,
  UpdateSupportTicketStatusForGuestRequest,
} from "@/types/request/support_ticket";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type { SupportTicketsResponseData } from "@/types/response/support_ticket";

const buildSupportTicketsQueryString = (params?: GetSupportTicketsRequest) => {
  const query = new URLSearchParams();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (params?.status) query.set("status", params.status);
  if (params?.priority) query.set("priority", params.priority);

  return query.toString();
};

export const getSupportTickets = async (params?: GetSupportTicketsRequest) => {
  const queryString = buildSupportTicketsQueryString(params);
  const url = queryString
    ? `/admin/support-tickets?${queryString}`
    : "/admin/support-tickets";

  return await axiosRequest.get<
    ApiResponseEnvelope<SupportTicketsResponseData>
  >(url);
};

export const createSupportTicketForGuest = async (
  payload: CreateSupportTicketForGuestRequest,
) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/support-tickets",
    payload,
  );
};

export const getSupportTicketsForGuest = async (
  params?: GetSupportTicketsRequest,
) => {
  const queryString = buildSupportTicketsQueryString(params);
  const url = queryString
    ? `/support-tickets?${queryString}`
    : "/support-tickets";

  return await axiosRequest.get<
    ApiResponseEnvelope<SupportTicketsResponseData>
  >(url);
};

export const updateSupportTicketStatusForAdmin = async (
  id: string,
  payload: UpdateSupportTicketStatusForAdminRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/support-tickets/${id}/status`,
    payload,
  );
};

export const updateSupportTicketStatusForGuest = async (
  id: string,
  payload: UpdateSupportTicketStatusForGuestRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/support-tickets/${id}/status`,
    payload,
  );
};
