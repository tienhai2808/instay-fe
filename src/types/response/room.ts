import { Room, SimpleRoomResponse } from "@/types/data/room";
import type { BookingStatus } from "@/types/request/booking";
import { PaginationMeta } from "./meta";

export type RoomResponse = Room;

export interface RoomsResponseData {
  rooms?: RoomResponse[];
  pagination?: PaginationMeta;
}

export interface RoomResponseData {
  room?: RoomResponse;
}

export interface RoomTypeRoomsResponseData {
  rooms?: SimpleRoomResponse[];
}

type RoomTimelineIdentity = string;

export interface RoomTimelineStatusSummary {
  all?: number;
  available?: number;
  occupied?: number;
  upcoming_checkin?: number;
  overdue_checkout?: number;
  overdue_checkin?: number;
}

export interface RoomTimelineBooking {
  booking_id: RoomTimelineIdentity;
  booking_number?: string;
  status?: BookingStatus;
  source_name?: string;
  guest_name?: string;
  check_in?: string;
  check_out?: string;
}

export interface RoomTimelineRoom {
  room_id: RoomTimelineIdentity;
  room_name?: string;
  price?: number;
  booking?: RoomTimelineBooking | null;
}

export interface RoomTimelineRoomTypeGroup {
  room_type_id: RoomTimelineIdentity;
  room_type_name?: string;
  rooms_count?: number;
  rooms?: RoomTimelineRoom[];
}

export interface RoomsTimelineResponseData {
  server_now?: string;
  status?: RoomTimelineStatusSummary;
  timeline?: RoomTimelineRoomTypeGroup[];
}
