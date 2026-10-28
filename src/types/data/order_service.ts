import type { BasicBookingRoomResponse } from "@/types/data/guest";
import type { ServiceDiscountType } from "@/types/data/service";
import type { User } from "@/types/data/user";
import type { OrderServiceStatus } from "@/types/request/order_service";

export interface BasicServiceImageResponse {
  key: string;
  url?: string;
}

export interface OrderServiceSummaryService {
  id: string;
  name?: string;
  slug?: string;
  price?: number;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
  thumbnail?: BasicServiceImageResponse | null;
}

export interface OrderService {
  id: string;
  service?: OrderServiceSummaryService | null;
  booking_room?: BasicBookingRoomResponse | null;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  status?: OrderServiceStatus;
  estimated_at?: string;
  guest_note?: string | null;
  staff_note?: string | null;
  cancel_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
}
