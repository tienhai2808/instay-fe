import type { BasicBookingRoomResponse } from "@/types/data/guest";
import type { User } from "@/types/data/user";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types/request/support_ticket";

interface SupportTicketCategory {
  id?: string;
  name?: string;
}

export interface SupportTicket {
  id: string;
  support_category?: SupportTicketCategory | null;
  booking_room?: BasicBookingRoomResponse | null;
  content?: string;
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  resolution_seconds?: number | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: User | null;
}
