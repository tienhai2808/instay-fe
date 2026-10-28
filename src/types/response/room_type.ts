import { RoomType } from "@/types/data/room_type";

export interface RoomTypesResponseData {
  room_types: RoomType[];
}

export interface CalculateRoomTypePriceResponseData {
  price?: {
    total_days?: number;
    total_price?: number;
    average_price?: number;
  } | null;
}
