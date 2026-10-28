import type { RoomTypePriceType } from "@/types/data/room_type_price";

export interface CreateRoomTypePriceRequest {
  room_type_id: string;
  pricing_tag_id: string;
  pricing_type: RoomTypePriceType;
  pricing_value: number;
}

export interface UpdateRoomTypePriceRequest {
  pricing_type: RoomTypePriceType;
  pricing_value: number;
}
