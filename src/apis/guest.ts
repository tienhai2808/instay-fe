import axiosRequest from "@/config/axios";
import type {
  CreateGuestRequest,
  CreateGuestVerificationSessionRequest,
  ExportGuestsRequest,
  GetGuestsRequest,
  UpdateGuestRequest,
} from "@/types/request/guest";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  GuestsResponseData,
  GuestVerificationSessionResponseData,
} from "@/types/response/guest";

export const getGuests = async (params?: GetGuestsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (search) query.set("search", search);
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);

  const queryString = query.toString();
  const url = queryString ? `/guests?${queryString}` : "/guests";

  return await axiosRequest.get<ApiResponseEnvelope<GuestsResponseData>>(url);
};

export const exportGuests = async (payload?: ExportGuestsRequest) => {
  return await axiosRequest.post<Blob>("/guests/export", payload || {}, {
    responseType: "blob",
  });
};

export const createGuestVerificationSession = async (
  payload?: CreateGuestVerificationSessionRequest,
) => {
  return await axiosRequest.post<
    ApiResponseEnvelope<GuestVerificationSessionResponseData>
  >("/guests/create-verification", payload || {});
};

export const createGuest = async (data: CreateGuestRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>("/guests", data);
};

export const updateGuest = async (id: string, data: UpdateGuestRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/guests/${id}`,
    data,
  );
};

export const deleteGuest = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/guests/${id}`,
  );
};
