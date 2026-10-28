import type {
  BookingRoomDetails,
  BookingRoomGuest,
} from "@/types/data/booking_room";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";

export interface BookingRoomResponseData {
  booking_room?: BookingRoomDetails;
}

export interface BookingRoomBasicResponseData {
  booking_room?: SimpleBookingRoomResponse | null;
}

export interface BookingRoomGuestsResponseData {
  guests?: BookingRoomGuest[];
}

export interface VerifyBookingRoomCodeResponseData {
  booking_room?: SimpleBookingRoomResponse | null;
}

export interface BookingRoomInfoResponseData {
  booking_room?: SimpleBookingRoomResponse | null;
}
