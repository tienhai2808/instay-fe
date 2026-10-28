import type { BasicRoomTypeResponse } from "./room_type";
import type { BasicBranch } from "./branch";
import type { Source } from "./source";
import type { User } from "./user";
import type { BasicRoomResponse } from "./room";

export type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "checked-in"
  | "checked-out";

export interface BookingPredict {
  cancellation_probability?: number;
  will_cancel?: boolean;
  risk_level?: string;
}

export interface Booking {
  id: string;
  booking_number?: string;
  guest_full_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in?: string;
  check_out?: string;
  room_number?: number;
  guest_number?: string;
  booked_on?: string;
  total_net_price?: number;
  total_sell_price?: number;
  promotion_name?: string;
  meal_plan?: string;
  booking_preferences?: string;
  booking_conditions?: string;
  note?: string;
  status?: BookingStatus;
  predict?: BookingPredict | null;
  room_type?: BasicRoomTypeResponse | null;
  branch?: BasicBranch | null;
  source?: Source | null;
  booking_rooms?: SimpleBookingRoomResponse[];
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}

export interface BasicBookingResponse {
  id: string;
  booking_number?: string;
  guest_full_name?: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  check_in?: string;
  check_out?: string;
}

export interface SimpleBookingRoomResponse {
  id: string;
  booking?: BasicBookingResponse | null;
  code?: string;
  room?: BasicRoomResponse | null;
}
