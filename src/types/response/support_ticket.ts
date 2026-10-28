import type { SupportTicket } from "@/types/data/support_ticket";
import type { PaginationMeta } from "./meta";

export interface SupportTicketsResponseData {
  support_tickets?: SupportTicket[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}
