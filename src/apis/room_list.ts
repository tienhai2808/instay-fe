import axiosRequest from "@/config/axios";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CreateRoomRequest,
  GetRoomsRequest,
  GetRoomsTimelineRequest,
  UpdateRoomRequest,
} from "@/types/request/room";
import {
  RoomResponseData,
  RoomsResponseData,
  RoomsTimelineResponseData,
} from "@/types/response/room";

export const getRooms = async (params?: GetRoomsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (search) query.set("search", search);
  if (params?.branch_id) query.set("branch_id", params.branch_id);
  if (params?.floor_id) query.set("floor_id", params.floor_id);
  if (params?.room_type_id) query.set("room_type_id", params.room_type_id);

  const queryString = query.toString();
  const url = queryString ? `/rooms?${queryString}` : "/rooms";

  return await axiosRequest.get<ApiResponseEnvelope<RoomsResponseData>>(url);
};

export const createRoom = async (data: CreateRoomRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<RoomResponseData>>(
    "/rooms",
    data,
  );
};

export const updateRoom = async (id: string, data: UpdateRoomRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/rooms/${id}`,
    data,
  );
};

export const deleteRoom = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/rooms/${id}`,
  );
};

export const deleteRooms = async (ids: string[]) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>("/rooms", {
    data: { ids },
  });
};

export const getRoomsTimeline = async (params?: GetRoomsTimelineRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();

  if (search) query.set("search", search);
  if (params?.branch_id) query.set("branch_id", params.branch_id);
  if (params?.floor_id) query.set("floor_id", params.floor_id);
  if (params?.room_type_id) query.set("room_type_id", params.room_type_id);

  const queryString = query.toString();
  const url = queryString
    ? `/rooms/timeline?${queryString}`
    : "/rooms/timeline";

  return await axiosRequest.get<ApiResponseEnvelope<RoomsTimelineResponseData>>(
    url,
  );
};
