export interface CreateGuestVerificationSessionRequest {
  booking_room_id?: string;
}

export interface GetGuestsRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  from_date?: string;
  to_date?: string;
}

export type ExportGuestsSort = "check_in" | "check_out";

export interface ExportGuestsRequest {
  sort?: ExportGuestsSort;
  order?: "asc" | "desc";
  from_date?: string;
  to_date?: string;
}

export interface CreateGuestRequest {
  full_name: string;
  dob: string;
  national: string;
  passport_number: string;
  booking_room_id: string;
}

export interface UpdateGuestRequest {
  full_name: string;
  dob: string;
  national: string;
  passport_number: string;
  booking_room_id?: string;
}
