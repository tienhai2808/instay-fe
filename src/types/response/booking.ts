import type { Booking } from "@/types/data/booking";
import type { BookingStatus } from "@/types/request/booking";
import type { PaginationMeta } from "./meta";

export interface BookingsResponseData {
  bookings?: Booking[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface BookingStatusesResponseData {
  all?: number;
  "checked-in"?: number;
  confirmed?: number;
  "checked-out"?: number;
  cancelled?: number;
}

export interface BookingResponseData {
  booking?: Booking;
}

export interface CreateBookingResponseData {
  id?: string;
  booking?: Booking;
}

type BookingTimelineIdentity = string;

export interface BookingTimelineStatusSummary {
  all?: number;
  available?: number;
  occupied?: number;
  booked?: number;
}

export interface BookingTimelineEvent {
  booking_id: BookingTimelineIdentity;
  check_in?: string;
  check_out?: string;
  title?: string;
  status?: BookingStatus;
  booking_number?: string;
}

export interface BookingTimelineRoom {
  room_id: BookingTimelineIdentity;
  room_name?: string;
  events?: BookingTimelineEvent[];
}

export interface BookingTimelineRoomTypeGroup {
  room_type_id: BookingTimelineIdentity;
  room_type_name?: string;
  rooms_count?: number;
  rooms?: BookingTimelineRoom[];
}

export interface BookingTimelineResponseData {
  start_date?: string;
  end_date?: string;
  status?: BookingTimelineStatusSummary;
  chart?: BookingTimelineRoomTypeGroup[];
}
