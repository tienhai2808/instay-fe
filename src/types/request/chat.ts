export interface GetGuestChatsRequest {
  page?: number;
  limit?: number;
  search?: string;
}

export interface GetGuestChatAvailabilityRequest {
  support_category_id?: string;
  service_id?: string;
}

export interface GetAdminChatAvailabilityRequest {
  booking_room_id?: string;
}

export interface GetGuestChatMessagesRequest {
  page?: number;
  limit?: number;
  includeChat?: boolean;
}
