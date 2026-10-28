import axiosRequest from "@/config/axios";
import {
  CreateBookingRequest,
  GetBookingsRequest,
  GetBookingStatusesRequest,
  GetBookingTimelineRequest,
  UpdateBookingStatusRequest,
  UpdateBookingRequest,
} from "@/types/request/booking";
import {
  BookingsResponseData,
  BookingStatusesResponseData,
  BookingTimelineResponseData,
  BookingResponseData,
  CreateBookingResponseData,
} from "@/types/response/booking";
import { ApiResponseEnvelope } from "@/types/response/common";

export const getBookings = async (params?: GetBookingsRequest) => {
  const query = new URLSearchParams();
  const sort = params?.sort?.trim();
  const search = params?.search?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (params?.status) query.set("status", params.status);
  if (search) query.set("search", search);
  if (params?.source_id) query.set("source_id", params.source_id);
  if (params?.branch_id) query.set("branch_id", params.branch_id);

  const queryString = query.toString();
  const url = queryString ? `/bookings?${queryString}` : "/bookings";

  return await axiosRequest.get<ApiResponseEnvelope<BookingsResponseData>>(url);
};

export const getBookingStatuses = async (
  params?: GetBookingStatusesRequest,
) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();

  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (search) query.set("search", search);
  if (params?.source_id) query.set("source_id", params.source_id);
  if (params?.branch_id) query.set("branch_id", params.branch_id);

  const queryString = query.toString();
  const url = queryString
    ? `/bookings/statuses?${queryString}`
    : "/bookings/statuses";

  return await axiosRequest.get<
    ApiResponseEnvelope<BookingStatusesResponseData>
  >(url);
};

export const getBookingTimeline = async (
  params?: GetBookingTimelineRequest,
) => {
  const query = new URLSearchParams();
  const roomTypeId = params?.room_type_id?.trim();
  const branchId = params?.branch_id?.trim();

  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);
  if (roomTypeId) query.set("room_type_id", roomTypeId);
  if (branchId) query.set("branch_id", branchId);

  const queryString = query.toString();
  const url = queryString
    ? `/bookings/timeline?${queryString}`
    : "/bookings/timeline";

  return await axiosRequest.get<
    ApiResponseEnvelope<BookingTimelineResponseData>
  >(url);
};

export const getBookingById = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<BookingResponseData>>(
    `/bookings/${id}`,
  );
};

export const createBooking = async (data: CreateBookingRequest) => {
  return await axiosRequest.post<
    ApiResponseEnvelope<CreateBookingResponseData>
  >("/bookings", data);
};

export const updateBooking = async (id: string, data: UpdateBookingRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/bookings/${id}`,
    data,
  );
};

export const updateBookingStatus = async (
  id: string,
  data: UpdateBookingStatusRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/bookings/${id}/status`,
    data,
  );
};

export const deleteBooking = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/bookings/${id}`,
  );
};
