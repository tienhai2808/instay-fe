import type { SimpleBookingRoomResponse } from "./booking";

export interface GuestReview {
  id: string;
  star?: number;
  content?: string;
  created_at?: string;
  booking_room?: SimpleBookingRoomResponse | null;
}
