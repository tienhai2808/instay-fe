import type { ServiceDiscountType } from "./service";

export interface BasicServiceSummary {
  id: string;
  name?: string;
  slug?: string;
  price?: number;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
}

export interface BasicSupportCategorySummary {
  id: string;
  name?: string;
}

export interface BookingRoomOrderService {
  id: string;
  service?: BasicServiceSummary | null;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  status?: string;
  estimated_at?: string;
  guest_note?: string | null;
}

export interface BookingRoomSupportTicket {
  id: string;
  support_category?: BasicSupportCategorySummary | null;
  content?: string;
  status?: string;
  priority?: string;
  created_at?: string;
}

export interface BookingRoomGuest {
  id: string;
  full_name?: string;
  dob?: string;
  national?: string;
  passport_number?: string;
}

export interface BookingRoomReview {
  id: string;
  star?: number;
  content?: string;
}

export interface BookingRoomDetails {
  id: string;
  order_services?: BookingRoomOrderService[];
  support_tickets?: BookingRoomSupportTicket[];
  guests?: BookingRoomGuest[];
  review?: BookingRoomReview | null;
}
