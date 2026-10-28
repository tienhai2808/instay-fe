import axiosRequest from "@/config/axios";
import type {
  CreateEventRequest,
  GetEventsRequest,
  UpdateEventRequest,
} from "@/types/request/event";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  EventResponseData,
  EventsResponseData,
  GuestNewsDetailResponseData,
  GuestNewsListResponseData,
} from "@/types/response/event";

export const getEvents = async (params?: GetEventsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.is_active != null)
    query.set("is_active", String(params.is_active));
  if (params?.branch_id) query.set("branch_id", params.branch_id);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/admin/events?${queryString}` : "/admin/events";

  return await axiosRequest.get<ApiResponseEnvelope<EventsResponseData>>(url);
};

export const getEventById = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<EventResponseData>>(
    `/admin/events/${id}`,
  );
};

export const getGuestNews = async (params?: GetEventsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/events?${queryString}` : "/events";

  return await axiosRequest.get<ApiResponseEnvelope<GuestNewsListResponseData>>(
    url,
  );
};

export const getGuestNewsBySlug = async (slug: string) => {
  const safeSlug = encodeURIComponent(slug.trim());
  return await axiosRequest.get<
    ApiResponseEnvelope<GuestNewsDetailResponseData>
  >(`/events/${safeSlug}`);
};

export const createEvent = async (data: CreateEventRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/admin/events",
    data,
  );
};

export const updateEvent = async (id: string, data: UpdateEventRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/admin/events/${id}`,
    data,
  );
};

export const deleteEvent = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/admin/events/${id}`,
  );
};

export const deleteEvents = async (ids: string[]) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    "/admin/events",
    {
      data: { ids },
    },
  );
};
