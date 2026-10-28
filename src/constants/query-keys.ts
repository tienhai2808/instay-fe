import type {
  GetBookingsRequest,
  GetBookingStatusesRequest,
  GetBookingTimelineRequest,
} from "@/types/request/booking";
import type { GetBranchesRequest } from "@/types/request/branch";
import type {
  GetDashboardBookingOverviewRequest,
  GetDashboardBookingRevenueRequest,
  GetDashboardRoomTypeRevenueRequest,
  GetDashboardSourceRevenueRequest,
} from "@/types/request/dashboard";
import type { GetDepartmentsRequest } from "@/types/request/department";
import type { GetCustomersRequest } from "@/types/request/customer";
import type { GetFloorsRequest } from "@/types/request/floor";
import type {
  GetRoomsRequest,
  GetRoomsTimelineRequest,
} from "@/types/request/room";
import type { GetRoomTypesRequest } from "@/types/request/room_type";
import type {
  GetServiceTypesRequest,
  GetServiceTypesWithServicesRequest,
} from "@/types/request/service_type";
import type { GetSourcesRequest } from "@/types/request/source";
import type { GetSupportCategoriesRequest } from "@/types/request/support_category";
import type { GetSupportTicketsRequest } from "@/types/request/support_ticket";
import type { GetGuestsRequest } from "@/types/request/guest";
import type { GetOrderServicesRequest } from "@/types/request/order_service";
import type { GetPricingCalendarsRequest } from "@/types/request/pricing_calendar";
import type { GetPricingTagsRequest } from "@/types/request/pricing_tag";
import type {
  GetReviewsForAdminRequest,
  GetReviewsSummaryForAdminRequest,
} from "@/types/request/review";
import type { GetUsersRequest } from "@/types/request/user";

export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (params: GetUsersRequest) => ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  departments: {
    all: ["departments"] as const,
    list: (params: GetDepartmentsRequest) =>
      ["departments", "list", params] as const,
    basic: () => ["departments", "basic"] as const,
    permissions: () => ["departments", "permissions"] as const,
  },
  branches: {
    all: ["branches"] as const,
    list: (params: GetBranchesRequest) => ["branches", "list", params] as const,
    basic: () => ["branches", "basic"] as const,
    locations: () => ["branches", "locations"] as const,
  },
  serviceTypes: {
    all: ["service-types"] as const,
    list: (params: GetServiceTypesRequest) =>
      ["service-types", "list", params] as const,
    basic: () => ["service-types", "basic"] as const,
    withServices: (params?: GetServiceTypesWithServicesRequest) =>
      ["service-types", "with-services", params ?? {}] as const,
  },
  supportCategories: {
    all: ["support-categories"] as const,
    list: (params: GetSupportCategoriesRequest) =>
      ["support-categories", "list", params] as const,
  },
  supportTickets: {
    all: ["support-tickets"] as const,
    list: (params: GetSupportTicketsRequest) =>
      ["support-tickets", "list", params] as const,
  },
  roomTypes: {
    all: ["room-types"] as const,
    list: (params: GetRoomTypesRequest) =>
      ["room-types", "list", params] as const,
    basic: () => ["room-types", "basic"] as const,
    filter: () => ["room-types", "filter"] as const,
  },
  floors: {
    all: ["floors"] as const,
    list: (params: GetFloorsRequest) => ["floors", "list", params] as const,
    basic: () => ["floors", "basic"] as const,
  },
  rooms: {
    all: ["rooms"] as const,
    list: (params: GetRoomsRequest) => ["rooms", "list", params] as const,
    timeline: (params?: GetRoomsTimelineRequest) =>
      ["rooms", "timeline", params ?? {}] as const,
  },
  bookings: {
    all: ["bookings"] as const,
    list: (params: GetBookingsRequest) => ["bookings", "list", params] as const,
    statuses: (params?: GetBookingStatusesRequest) =>
      ["bookings", "statuses", params ?? {}] as const,
    timeline: (params?: GetBookingTimelineRequest) =>
      ["bookings", "timeline", params ?? {}] as const,
    detail: (id: string) => ["bookings", "detail", id] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    bookingOverview: (params?: GetDashboardBookingOverviewRequest) =>
      ["dashboard", "booking-overview", params ?? {}] as const,
    bookingRevenue: (params?: GetDashboardBookingRevenueRequest) =>
      ["dashboard", "booking-revenue", params ?? {}] as const,
    roomTypeRevenue: (params?: GetDashboardRoomTypeRevenueRequest) =>
      ["dashboard", "room-type-revenue", params ?? {}] as const,
    sourceRevenue: (params?: GetDashboardSourceRevenueRequest) =>
      ["dashboard", "source-revenue", params ?? {}] as const,
    guestNational: () => ["dashboard", "guest-national"] as const,
    serviceTypeCount: () => ["dashboard", "service-type-count"] as const,
    supportTicketTime: () => ["dashboard", "support-ticket-time"] as const,
    reviewSummary: () => ["dashboard", "review-summary"] as const,
    reviewCategoryCount: () => ["dashboard", "review-category-count"] as const,
    reviewCategorySentiment: () =>
      ["dashboard", "review-category-sentiment"] as const,
    reviewSentimentCount: () =>
      ["dashboard", "review-sentiment-count"] as const,
    reviewSentimentTime: () => ["dashboard", "review-sentiment-time"] as const,
  },
  bookingRooms: {
    all: ["booking-rooms"] as const,
    detail: (id: string) => ["booking-rooms", "detail", id] as const,
    guests: (id: string) => ["booking-rooms", "guests", id] as const,
  },
  guests: {
    all: ["guests"] as const,
    list: (params: GetGuestsRequest) => ["guests", "list", params] as const,
  },
  customers: {
    all: ["customers"] as const,
    list: (params: GetCustomersRequest) =>
      ["customers", "list", params] as const,
  },
  orderServices: {
    all: ["order-services"] as const,
    list: (params: GetOrderServicesRequest) =>
      ["order-services", "list", params] as const,
    detail: (id: string) => ["order-services", "detail", id] as const,
  },
  reviews: {
    all: ["reviews"] as const,
    list: (params: GetReviewsForAdminRequest) =>
      ["reviews", "list", params] as const,
    summary: (params?: GetReviewsSummaryForAdminRequest) =>
      ["reviews", "summary", params ?? {}] as const,
  },
  sources: {
    all: ["sources"] as const,
    list: (params: GetSourcesRequest) => ["sources", "list", params] as const,
    basic: () => ["sources", "basic"] as const,
  },
  pricingTags: {
    all: ["pricing-tags"] as const,
    list: (params: GetPricingTagsRequest) =>
      ["pricing-tags", "list", params] as const,
    basic: () => ["pricing-tags", "basic"] as const,
  },
  pricingCalendars: {
    all: ["pricing-calendars"] as const,
    list: (params?: GetPricingCalendarsRequest) =>
      ["pricing-calendars", "list", params ?? {}] as const,
  },
  tenant: {
    all: ["tenant"] as const,
    detail: () => ["tenant", "detail"] as const,
    settings: () => ["tenant", "settings"] as const,
  },
  auth: {
    all: ["auth"] as const,
    me: () => ["auth", "me"] as const,
  },
};
