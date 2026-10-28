import axiosRequest from "@/config/axios";
import type {
  CreateBookingRoomRequest,
  UpdateBookingRoomRequest,
  VerifyBookingRoomCodeRequest,
} from "@/types/request/booking_room";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  BookingRoomBasicResponseData,
  BookingRoomInfoResponseData,
  BookingRoomGuestsResponseData,
  BookingRoomResponseData,
  VerifyBookingRoomCodeResponseData,
} from "@/types/response/booking_room";

export const getBookingRoomById = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<BookingRoomResponseData>>(
    `/booking-rooms/${id}`,
  );
};

export const getBookingRoomByIdBasic = async (id: string) => {
  return await axiosRequest.get<
    ApiResponseEnvelope<BookingRoomBasicResponseData>
  >(`/booking-rooms/${id}`, {
    params: {
      view: "basic",
    },
  });
};

export const getBookingRoomGuests = async (id: string) => {
  return await axiosRequest.get<
    ApiResponseEnvelope<BookingRoomGuestsResponseData>
  >(`/booking-rooms/${id}/guests`);
};

export const getBookingRoomInfo = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<BookingRoomInfoResponseData>
  >("/booking-rooms/info");
};

export const createBookingRoom = async (data: CreateBookingRoomRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/booking-rooms",
    data,
  );
};

export const updateBookingRoom = async (
  id: string,
  data: UpdateBookingRoomRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/booking-rooms/${id}`,
    data,
  );
};

export const verifyBookingRoomCode = async (
  data: VerifyBookingRoomCodeRequest,
) => {
  return await axiosRequest.post<
    ApiResponseEnvelope<VerifyBookingRoomCodeResponseData>
  >("/booking-rooms/verify", data);
};
