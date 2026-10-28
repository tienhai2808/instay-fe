import axiosRequest from "@/config/axios";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  CreateRoomTypePriceRequest,
  UpdateRoomTypePriceRequest,
} from "@/types/request/room_type_price";

export const createRoomTypePrice = async (data: CreateRoomTypePriceRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/room-type-prices",
    data,
  );
};

export const updateRoomTypePrice = async (
  id: string,
  data: UpdateRoomTypePriceRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/room-type-prices/${id}`,
    data,
  );
};

export const deleteRoomTypePrice = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/room-type-prices/${id}`,
  );
};
