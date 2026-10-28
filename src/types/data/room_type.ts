import { User } from "./user";
import type { BasicBranch } from "./branch";
import type { RoomTypePrice } from "./room_type_price";

export interface BasicRoomTypeResponse {
  id: string;
  name: string;
}

export interface RoomType {
  id: string;
  name: string;
  price: number;
  surface_area: number;
  max_people: number;
  branches?: BasicBranch[];
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
  rooms_count?: number;
  room_type_prices?: RoomTypePrice[];
}
