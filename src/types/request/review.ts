export interface CreateReviewForGuestRequest {
  star: number;
  content: string;
}

export interface UpdateReviewForGuestRequest {
  star: number;
  content: string;
}

export type ReviewSortField = "created_at";
export type ReviewSortOrder = "asc" | "desc";

export interface GetReviewsForAdminRequest {
  page?: number;
  limit?: number;
  sort?: ReviewSortField;
  order?: ReviewSortOrder;
  star?: number;
  from_date?: string;
  to_date?: string;
}

export interface GetReviewsSummaryForAdminRequest {
  from_date?: string;
  to_date?: string;
}
