import { BasicFloorResponse } from "./floor";
import { BasicRoomTypeResponse } from "./room_type";
import { User } from "./user";

export interface BasicRoomResponse {
  id: string;
  name: string;
}

export interface SimpleRoomResponse extends BasicRoomResponse {
  is_available?: boolean;
}

export interface Room {
  id: string;
  name: string;
  is_available?: boolean;
  room_type?: BasicRoomTypeResponse | null;
  floor?: BasicFloorResponse | null;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
