import type { Guest } from "@/types/data/guest";
import type { PaginationMeta } from "./meta";

export interface GuestVerificationSessionResponseData {
  session_id?: string;
  verification_url?: string;
}

export interface GuestsResponseData {
  guests?: Guest[];
  pagination?: PaginationMeta;
}
