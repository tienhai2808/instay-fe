import type { Event } from "@/types/data/event";
import type { NewsDetail, NewsSummary } from "@/types/data/event";
import type { PaginationMeta } from "./meta";

export interface EventsResponseData {
  events?: Event[];
  meta?: PaginationMeta;
}

export interface EventResponseData {
  event?: Event;
}

export interface CreateEventResponseData {
  id?: string;
}

export type GuestNewsListResponseData =
  | NewsSummary[]
  | {
      events?: NewsSummary[];
      meta?: PaginationMeta;
    };

export type GuestNewsDetailResponseData =
  | NewsDetail
  | {
      event?: NewsDetail;
    };
