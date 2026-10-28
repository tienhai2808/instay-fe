import type { GuestReview } from "@/types/data/review";
import type { PaginationMeta } from "./meta";

export interface ReviewsSummary {
  all?: number;
  average?: number;
  five_star_percent?: number;
  four_star_percent?: number;
  three_star_percent?: number;
  two_star_percent?: number;
  one_star_percent?: number;
}

export interface ReviewsResponseData {
  reviews?: GuestReview[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface ReviewsSummaryResponseData {
  summary?: ReviewsSummary | null;
}

export interface MyReviewResponseData {
  review?: GuestReview | null;
}
