export interface GetRoomTypesRequest {
  view?: string;
  search?: string;
  branch_id?: string;
}

export interface CreateRoomTypeRequest {
  name: string;
  price: number;
  surface_area: number;
  max_people: number;
  branch_ids: string[];
}

export interface UpdateRoomTypeRequest {
  name: string;
  price: number;
  surface_area: number;
  max_people: number;
  branch_ids: string[];
}

export interface CalculateRoomTypePriceRequest {
  room_type_id: string;
  from_date: string;
  to_date: string;
  quantity: number;
}
