import axiosRequest from "@/config/axios";
import {
  CalculateRoomTypePriceRequest,
  GetRoomTypesRequest,
  CreateRoomTypeRequest,
  UpdateRoomTypeRequest,
} from "@/types/request/room_type";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CalculateRoomTypePriceResponseData,
  RoomTypesResponseData,
} from "@/types/response/room_type";
import { RoomTypeRoomsResponseData } from "@/types/response/room";

export const getRoomTypes = async (params?: GetRoomTypesRequest) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();

  if (view) query.set("view", view);
  if (search) query.set("search", search);
  if (params?.branch_id) query.set("branch_id", params.branch_id);

  const queryString = query.toString();
  const url = queryString ? `/room-types?${queryString}` : "/room-types";

  return await axiosRequest.get<ApiResponseEnvelope<RoomTypesResponseData>>(
    url,
  );
};

export const createRoomType = async (data: CreateRoomTypeRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/room-types",
    data,
  );
};

export const updateRoomType = async (
  id: string,
  data: UpdateRoomTypeRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/room-types/${id}`,
    data,
  );
};

export const deleteRoomType = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/room-types/${id}`,
  );
};

export const getRoomsByRoomTypeId = async (id: string) => {
  return await axiosRequest.get<ApiResponseEnvelope<RoomTypeRoomsResponseData>>(
    `/room-types/${id}/rooms`,
  );
};

export const calculateRoomTypePrice = async (
  data: CalculateRoomTypePriceRequest,
) => {
  return await axiosRequest.post<
    ApiResponseEnvelope<CalculateRoomTypePriceResponseData>
  >("/room-types/price-calculation", data);
};
