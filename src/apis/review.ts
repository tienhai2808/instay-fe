import axiosRequest from "@/config/axios";
import type {
  CreateReviewForGuestRequest,
  GetReviewsForAdminRequest,
  GetReviewsSummaryForAdminRequest,
  UpdateReviewForGuestRequest,
} from "@/types/request/review";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  MyReviewResponseData,
  ReviewsResponseData,
  ReviewsSummaryResponseData,
} from "@/types/response/review";

export interface GetReviewsForGuestRequest {
  limit?: number;
}

const buildReviewDateRangeQueryString = (
  params?: GetReviewsSummaryForAdminRequest,
) => {
  const query = new URLSearchParams();
  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);

  return query.toString();
};

const buildReviewsForAdminQueryString = (
  params?: GetReviewsForAdminRequest,
) => {
  const query = new URLSearchParams(buildReviewDateRangeQueryString(params));
  const sort = params?.sort?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (sort) query.set("sort", sort);
  if (params?.order) query.set("order", params.order);
  if (params?.star) query.set("star", String(params.star));

  return query.toString();
};

export const getReviewsForAdmin = async (
  params?: GetReviewsForAdminRequest,
) => {
  const queryString = buildReviewsForAdminQueryString(params);
  const url = queryString ? `/admin/reviews?${queryString}` : "/admin/reviews";

  return await axiosRequest.get<ApiResponseEnvelope<ReviewsResponseData>>(url);
};

export const getReviewsSummaryForAdmin = async (
  params?: GetReviewsSummaryForAdminRequest,
) => {
  const queryString = buildReviewDateRangeQueryString(params);
  const url = queryString
    ? `/admin/reviews/summary?${queryString}`
    : "/admin/reviews/summary";

  return await axiosRequest.get<
    ApiResponseEnvelope<ReviewsSummaryResponseData>
  >(url);
};

export const getReviewsForGuest = async (
  params?: GetReviewsForGuestRequest,
) => {
  const query = new URLSearchParams();

  if (params?.limit) query.set("limit", String(params.limit));

  const queryString = query.toString();
  const url = queryString ? `/reviews?${queryString}` : "/reviews";

  return await axiosRequest.get<ApiResponseEnvelope<ReviewsResponseData>>(url);
};

export const getMyReviewForGuest = async () => {
  return await axiosRequest.get<ApiResponseEnvelope<MyReviewResponseData>>(
    "/reviews/me",
  );
};

export const createReviewForGuest = async (
  payload: CreateReviewForGuestRequest,
) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/reviews",
    payload,
  );
};

export const updateMyReviewForGuest = async (
  payload: UpdateReviewForGuestRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/reviews/me",
    payload,
  );
};
