export type SupportTicketPriority = "low" | "medium" | "high" | "urgent";
export type SupportTicketStatus = "pending" | "accepted" | "cancelled" | "done";
export type SupportTicketAdminUpdateStatus = "accepted" | "done";
export type SupportTicketGuestUpdateStatus = "cancelled";

export interface GetSupportTicketsRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  from_date?: string;
  to_date?: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
}

export interface CreateSupportTicketForGuestRequest {
  support_category_id: string;
  content: string;
  priority: SupportTicketPriority;
}

export interface UpdateSupportTicketStatusForAdminRequest {
  status: SupportTicketAdminUpdateStatus;
}

export interface UpdateSupportTicketStatusForGuestRequest {
  status: SupportTicketGuestUpdateStatus;
}
