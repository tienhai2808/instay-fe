import type { BasicRoomResponse } from "./room";
import type { User } from "./user";

export interface BasicBookingRoomResponse {
  id: string;
  code?: string;
  room?: BasicRoomResponse | null;
}

export interface Guest {
  id: string;
  full_name?: string;
  dob?: string;
  national?: string;
  passport_number?: string;
  check_in?: string;
  check_out?: string;
  booking_room?: BasicBookingRoomResponse | null;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
