export type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "checked-in"
  | "checked-out";

export interface GetBookingsRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  from_date?: string;
  to_date?: string;
  status?: BookingStatus;
  search?: string;
  source_id?: string;
  branch_id?: string;
}

export interface GetBookingStatusesRequest {
  from_date?: string;
  to_date?: string;
  search?: string;
  source_id?: string;
  branch_id?: string;
}

export interface GetBookingTimelineRequest {
  from_date?: string;
  to_date?: string;
  room_type_id?: string;
  branch_id?: string;
}

export interface CreateBookingRequest {
  booking_number?: string;
  guest_full_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  room_type_id: string;
  branch_id?: string;
  room_number: number;
  guest_number: string;
  total_net_price?: number;
  total_sell_price?: number;
  promotion_name?: string;
  meal_plan?: string;
  booking_preferences?: string;
  booking_conditions?: string;
  note?: string;
  source_id: string;
}

export interface UpdateBookingRequest {
  guest_full_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  room_type_id: string;
  branch_id?: string;
  room_number: number;
  guest_number: string;
  promotion_name?: string;
  meal_plan?: string;
  booking_preferences?: string;
  booking_conditions?: string;
  note?: string;
}

export interface UpdateBookingStatusRequest {
  status: BookingStatus;
  room_ids?: string[];
}
