export interface CreateBookingRoomRequest {
  booking_id: string;
  room_id: string;
}

export interface UpdateBookingRoomRequest {
  room_id: string;
}

export interface VerifyBookingRoomCodeRequest {
  code: string;
}
