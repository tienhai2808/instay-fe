export interface GetRoomsRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branch_id?: string;
  floor_id?: string;
  room_type_id?: string;
}

export interface GetRoomsTimelineRequest {
  search?: string;
  branch_id?: string;
  floor_id?: string;
  room_type_id?: string;
}

export interface CreateRoomRequest {
  name: string;
  floor_id: string;
  room_type_id: string;
}

export interface UpdateRoomRequest {
  name: string;
  floor_id: string;
  room_type_id: string;
}
