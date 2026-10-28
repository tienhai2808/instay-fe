export interface GetEventsRequest {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  branch_id?: string;
  is_active?: boolean;
}

export interface EventPayload {
  title: string;
  excerpt: string;
  content: string;
  thumbnail: string;
  is_active: boolean;
  branch_ids?: string[];
  send_notification?: boolean;
}

export type CreateEventRequest = EventPayload;
export type UpdateEventRequest = EventPayload;
