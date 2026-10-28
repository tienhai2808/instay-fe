type DashboardIdentity = string;

export interface DashboardBookingOverviewMetrics {
  total_revenue?: number;
  total_revenue_change_percent?: number;
  occupancy_rate?: number;
  occupancy_rate_change_percent?: number;
  cancellation_rate?: number;
  cancellation_rate_change_percent?: number;
  average_days_stay?: number;
  average_days_stay_change_percent?: number;
}

export interface DashboardBookingOverviewResponseData {
  data?: DashboardBookingOverviewMetrics;
}

export interface DashboardBookingRevenueChartItem {
  date?: string;
  revenue?: number;
}

export interface DashboardBookingRevenueChartData {
  granularity?: string;
  from_date?: string;
  to_date?: string;
  chart?: DashboardBookingRevenueChartItem[];
}

export interface DashboardBookingRevenueResponseData {
  data?: DashboardBookingRevenueChartData;
}

export interface DashboardRoomTypeRevenueChartItem {
  room_type_id?: DashboardIdentity;
  room_type_name?: string;
  revenue?: number;
}

export interface DashboardRoomTypeRevenueChartData {
  chart?: DashboardRoomTypeRevenueChartItem[];
}

export interface DashboardRoomTypeRevenueResponseData {
  data?: DashboardRoomTypeRevenueChartData;
}

export interface DashboardSourceRevenueChartItem {
  source_id?: DashboardIdentity;
  source_name?: string;
  revenue?: number;
  revenue_percent?: number;
}

export interface DashboardSourceRevenueChartData {
  chart?: DashboardSourceRevenueChartItem[];
}

export interface DashboardSourceRevenueResponseData {
  data?: DashboardSourceRevenueChartData;
}

export interface DashboardGuestNationalChartItem {
  national?: string;
  guest_count?: number;
}

export interface DashboardGuestNationalChartData {
  chart?: DashboardGuestNationalChartItem[];
}

export interface DashboardGuestNationalResponseData {
  data?: DashboardGuestNationalChartData;
}

export interface DashboardServiceTypeCountChartItem {
  service_type_id?: DashboardIdentity;
  service_type_name?: string;
  order_count?: number;
  order_percent?: number;
}

export interface DashboardServiceTypeCountChartData {
  chart?: DashboardServiceTypeCountChartItem[];
}

export interface DashboardServiceTypeCountResponseData {
  data?: DashboardServiceTypeCountChartData;
}

export interface DashboardSupportTicketTimeChartItem {
  tag?: string;
  ticket_count?: number;
  ticket_percent?: number;
}

export interface DashboardSupportTicketTimeChartData {
  average_resolution_minutes?: number;
  chart?: DashboardSupportTicketTimeChartItem[];
}

export interface DashboardSupportTicketTimeResponseData {
  data?: DashboardSupportTicketTimeChartData;
}

export interface DashboardReviewSummaryMetrics {
  review_count?: number;
  average_star?: number;
  positive_rate?: number;
  negative_rate?: number;
}

export interface DashboardReviewSummaryResponseData {
  data?: DashboardReviewSummaryMetrics;
}

export interface DashboardReviewCategoryCountChartItem {
  category?: string;
  review_count?: number;
}

export interface DashboardReviewCategoryCountChartData {
  chart?: DashboardReviewCategoryCountChartItem[];
}

export interface DashboardReviewCategoryCountResponseData {
  data?: DashboardReviewCategoryCountChartData;
}

export interface DashboardReviewSentimentValue {
  count?: number;
  percent?: number;
}

export interface DashboardReviewCategorySentimentChartItem {
  category?: string;
  positive?: DashboardReviewSentimentValue;
  negative?: DashboardReviewSentimentValue;
  neutral?: DashboardReviewSentimentValue;
}

export interface DashboardReviewCategorySentimentChartData {
  chart?: DashboardReviewCategorySentimentChartItem[];
}

export interface DashboardReviewCategorySentimentResponseData {
  data?: DashboardReviewCategorySentimentChartData;
}

export interface DashboardReviewSentimentCountChartData {
  positive?: DashboardReviewSentimentValue;
  negative?: DashboardReviewSentimentValue;
  neutral?: DashboardReviewSentimentValue;
}

export interface DashboardReviewSentimentCountResponseData {
  data?: DashboardReviewSentimentCountChartData;
}

export interface DashboardReviewSentimentTimeChartItem {
  date?: string;
  positive?: DashboardReviewSentimentValue;
  negative?: DashboardReviewSentimentValue;
  neutral?: DashboardReviewSentimentValue;
}

export interface DashboardReviewSentimentTimeChartData {
  granularity?: string;
  from_date?: string;
  to_date?: string;
  chart?: DashboardReviewSentimentTimeChartItem[];
}

export interface DashboardReviewSentimentTimeResponseData {
  data?: DashboardReviewSentimentTimeChartData;
}
