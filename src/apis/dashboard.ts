import axiosRequest from "@/config/axios";
import type {
  GetDashboardBookingOverviewRequest,
  GetDashboardBookingRevenueRequest,
  GetDashboardRoomTypeRevenueRequest,
  GetDashboardSourceRevenueRequest,
} from "@/types/request/dashboard";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  DashboardBookingOverviewResponseData,
  DashboardBookingRevenueResponseData,
  DashboardGuestNationalResponseData,
  DashboardReviewCategoryCountResponseData,
  DashboardReviewCategorySentimentResponseData,
  DashboardReviewSentimentCountResponseData,
  DashboardReviewSentimentTimeResponseData,
  DashboardReviewSummaryResponseData,
  DashboardRoomTypeRevenueResponseData,
  DashboardServiceTypeCountResponseData,
  DashboardSourceRevenueResponseData,
  DashboardSupportTicketTimeResponseData,
} from "@/types/response/dashboard";

const buildFromToDateQueryString = (
  params?:
    | GetDashboardBookingOverviewRequest
    | GetDashboardRoomTypeRevenueRequest
    | GetDashboardSourceRevenueRequest,
) => {
  const query = new URLSearchParams();

  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);

  return query.toString();
};

export const getDashboardBookingOverview = async (
  params?: GetDashboardBookingOverviewRequest,
) => {
  const queryString = buildFromToDateQueryString(params);
  const url = queryString
    ? `/dashboards/booking-overview?${queryString}`
    : "/dashboards/booking-overview";

  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardBookingOverviewResponseData>
  >(url);
};

export const getDashboardBookingRevenue = async (
  params?: GetDashboardBookingRevenueRequest,
) => {
  const query = new URLSearchParams();
  const roomTypeId = params?.room_type_id?.trim();
  if (roomTypeId) query.set("room_type_id", roomTypeId);

  const queryString = query.toString();
  const url = queryString
    ? `/dashboards/booking-revenue?${queryString}`
    : "/dashboards/booking-revenue";

  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardBookingRevenueResponseData>
  >(url);
};

export const getDashboardRoomTypeRevenue = async (
  params?: GetDashboardRoomTypeRevenueRequest,
) => {
  const queryString = buildFromToDateQueryString(params);
  const url = queryString
    ? `/dashboards/room-type-revenue?${queryString}`
    : "/dashboards/room-type-revenue";

  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardRoomTypeRevenueResponseData>
  >(url);
};

export const getDashboardSourceRevenue = async (
  params?: GetDashboardSourceRevenueRequest,
) => {
  const queryString = buildFromToDateQueryString(params);
  const url = queryString
    ? `/dashboards/source-revenue?${queryString}`
    : "/dashboards/source-revenue";

  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardSourceRevenueResponseData>
  >(url);
};

export const getDashboardGuestNational = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardGuestNationalResponseData>
  >("/dashboards/guest-national");
};

export const getDashboardServiceTypeCount = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardServiceTypeCountResponseData>
  >("/dashboards/service-type-count");
};

export const getDashboardSupportTicketTime = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardSupportTicketTimeResponseData>
  >("/dashboards/support-ticket-time");
};

export const getDashboardReviewSummary = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardReviewSummaryResponseData>
  >("/dashboards/review-summary");
};

export const getDashboardReviewCategoryCount = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardReviewCategoryCountResponseData>
  >("/dashboards/review-category-count");
};

export const getDashboardReviewCategorySentiment = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardReviewCategorySentimentResponseData>
  >("/dashboards/review-category-sentiment");
};

export const getDashboardReviewSentimentCount = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardReviewSentimentCountResponseData>
  >("/dashboards/review-sentiment-count");
};

export const getDashboardReviewSentimentTime = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<DashboardReviewSentimentTimeResponseData>
  >("/dashboards/review-sentiment-time");
};
