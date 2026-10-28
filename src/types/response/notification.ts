import { PaginationMeta } from "./meta";

export interface NotificationUnreadCountResponseData {
  count: number;
}

export interface NotificationResponse {
  id: string;
  content_type: string;
  content_key: string;
  content_vi: string;
  content_en: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponseData {
  notifications: NotificationResponse[];
  meta: PaginationMeta;
}
