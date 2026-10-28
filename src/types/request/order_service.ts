export type OrderServiceStatus = "confirmed" | "pending" | "cancelled";

export interface UpdateOrderServiceStatusForAdminRequest {
  status: OrderServiceStatus;
  staff_note?: string | null;
  cancel_reason?: string | null;
}

export interface UpdateOrderServiceStatusForGuestRequest {
  status: "cancelled";
  cancel_reason?: string;
}

export interface GetOrderServicesRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  from_date?: string;
  to_date?: string;
  status?: OrderServiceStatus;
}

export interface CreateOrderServiceForAdminRequest {
  booking_room_id: string;
  service_id: string;
  quantity: number;
  estimated_at: string;
  guest_note?: string;
}

export interface CreateOrderServiceForGuestRequest {
  service_id: string;
  quantity: number;
  estimated_at: string;
  guest_note?: string;
}
