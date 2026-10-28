"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { getBookings, getBookingStatuses } from "@/apis/booking";
import {
  getDashboardBookingOverview,
  getDashboardBookingRevenue,
  getDashboardGuestNational,
  getDashboardReviewCategoryCount,
  getDashboardReviewCategorySentiment,
  getDashboardReviewSentimentCount,
  getDashboardReviewSentimentTime,
  getDashboardReviewSummary,
  getDashboardRoomTypeRevenue,
  getDashboardServiceTypeCount,
  getDashboardSourceRevenue,
  getDashboardSupportTicketTime,
} from "@/apis/dashboard";
import { getRoomTypes } from "@/apis/room_type";
import { getSupportTickets } from "@/apis/support_ticket";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { GetBookingsRequest } from "@/types/request/booking";
import type { GetSupportTicketsRequest } from "@/types/request/support_ticket";
import type {
  DashboardGuestNationalChartItem,
  DashboardReviewCategoryCountChartItem,
  DashboardReviewCategorySentimentChartItem,
  DashboardReviewSentimentCountChartData,
  DashboardReviewSentimentTimeChartData,
  DashboardRoomTypeRevenueChartItem,
  DashboardServiceTypeCountChartItem,
  DashboardSupportTicketTimeChartItem,
} from "@/types/response/dashboard";
import type { RoomType } from "@/types/data/room_type";
import type { SupportTicketsResponseData } from "@/types/response/support_ticket";
import { useAuthStore } from "@/stores/useAuthStore";
import DashboardOverviewFilters from "./components/DashboardOverviewFilters";
import DashboardTabs from "./components/DashboardTabs";
import GuestNationalityChart from "./components/GuestNationalityChart";
import OperationMetricCards, {
  type OperationOverviewMetrics,
} from "./components/OperationMetricCards";
import OverviewMetricCards from "./components/OverviewMetricCards";
import RecentBookingsTable from "./components/RecentBookingsTable";
import RecentSupportTicketsTable from "./components/RecentSupportTicketsTable";
import ReviewCategoryCountBarChart from "./components/ReviewCategoryCountBarChart";
import ReviewCategorySentimentStackedBarChart from "./components/ReviewCategorySentimentStackedBarChart";
import ReviewMetricCards from "./components/ReviewMetricCards";
import ReviewSentimentDonutChart from "./components/ReviewSentimentDonutChart";
import ReviewSentimentTimeAreaChart from "./components/ReviewSentimentTimeAreaChart";
import RevenueOverTimeChart from "./components/RevenueOverTimeChart";
import RoomTypeRevenueChart from "./components/RoomTypeRevenueChart";
import ServiceTypeCountChart from "./components/ServiceTypeCountChart";
import SourceRevenueChart from "./components/SourceRevenueChart";
import SupportTicketResolutionDonutChart from "./components/SupportTicketResolutionDonutChart";
import {
  type DashboardDateRange,
  type DashboardMainDatePreset,
  type DashboardTabKey,
  DASHBOARD_MAIN_DATE_PRESET_VALUES,
  createTrailingDateRange,
  resolveDateRangeFromPreset,
  toSafeNumber,
} from "./utils/dashboard-utils";

const DEFAULT_TAB: DashboardTabKey = "overview";
const DEFAULT_MAIN_FILTER_PRESET: DashboardMainDatePreset = "last_7_days";
const ALL_ROOM_TYPES_VALUE = "all";
const DASHBOARD_TAB_STORAGE_KEY = "dashboard:tab";

const createDefaultDashboardDateRange = (): DashboardDateRange =>
  createTrailingDateRange(7, dayjs().startOf("day"));

const isDashboardTabKey = (value: string | null): value is DashboardTabKey =>
  value === "overview" || value === "operation" || value === "review";

const toNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
};

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const normalizeRoomTypeRevenueItems = (
  items: DashboardRoomTypeRevenueChartItem[],
) => {
  return items
    .map((item) => ({
      ...item,
      room_type_id: toTrimmedString(item.room_type_id),
      room_type_name: item.room_type_name?.trim() || "-",
      revenue: Math.max(0, toSafeNumber(item.revenue, 0)),
    }))
    .sort((first, second) => second.revenue - first.revenue);
};

const normalizeRoomTypes = (items: RoomType[]) => {
  return items.map((item) => ({
    ...item,
    id: String(item.id),
  }));
};

const normalizeGuestNationalItems = (
  items: DashboardGuestNationalChartItem[],
) => {
  return items.map((item) => ({
    ...item,
    national: item.national?.trim().toUpperCase() || "-",
    guest_count: Math.max(0, toSafeNumber(item.guest_count, 0)),
  }));
};

const normalizeServiceTypeCountItems = (
  items: DashboardServiceTypeCountChartItem[],
) => {
  return items.map((item) => ({
    ...item,
    service_type_id: toTrimmedString(item.service_type_id),
    service_type_name: item.service_type_name?.trim() || "-",
    order_count: Math.max(0, toSafeNumber(item.order_count, 0)),
    order_percent: Math.max(0, toSafeNumber(item.order_percent, 0)),
  }));
};

const normalizeSupportTicketTimeItems = (
  items: DashboardSupportTicketTimeChartItem[],
) => {
  return items.map((item) => ({
    ...item,
    tag: item.tag?.trim() || "-",
    ticket_count: Math.max(0, toSafeNumber(item.ticket_count, 0)),
    ticket_percent: Math.max(0, toSafeNumber(item.ticket_percent, 0)),
  }));
};

const normalizeReviewSentimentValue = (value: {
  count?: number;
  percent?: number;
}) => ({
  count: Math.max(0, toSafeNumber(value?.count, 0)),
  percent: Math.max(0, toSafeNumber(value?.percent, 0)),
});

const normalizeReviewCategoryCountItems = (
  items: DashboardReviewCategoryCountChartItem[],
) => {
  return items.map((item) => ({
    ...item,
    category: item.category?.trim() || "-",
    review_count: Math.max(0, toSafeNumber(item.review_count, 0)),
  }));
};

const normalizeReviewCategorySentimentItems = (
  items: DashboardReviewCategorySentimentChartItem[],
) => {
  return items.map((item) => ({
    ...item,
    category: item.category?.trim() || "-",
    positive: normalizeReviewSentimentValue(item.positive || {}),
    negative: normalizeReviewSentimentValue(item.negative || {}),
    neutral: normalizeReviewSentimentValue(item.neutral || {}),
  }));
};

const normalizeReviewSentimentCountData = (
  payload: DashboardReviewSentimentCountChartData | null | undefined,
) => ({
  positive: normalizeReviewSentimentValue(payload?.positive || {}),
  negative: normalizeReviewSentimentValue(payload?.negative || {}),
  neutral: normalizeReviewSentimentValue(payload?.neutral || {}),
});

const normalizeReviewSentimentTimeData = (
  payload: DashboardReviewSentimentTimeChartData | null | undefined,
) => ({
  granularity: payload?.granularity?.trim() || "day",
  from_date: payload?.from_date,
  to_date: payload?.to_date,
  chart: (payload?.chart || []).map((item) => ({
    date: item.date,
    positive: normalizeReviewSentimentValue(item.positive || {}),
    negative: normalizeReviewSentimentValue(item.negative || {}),
    neutral: normalizeReviewSentimentValue(item.neutral || {}),
  })),
});

const resolveSupportTicketsTotal = (
  payload: SupportTicketsResponseData | null | undefined,
) => {
  const pagination = payload?.meta || payload?.pagination;
  return toNonNegativeNumber(pagination?.total) ?? 0;
};

export default function DashboardPage() {
  const t = useTranslations("DashboardPage");
  const messageApi = useMessage();
  const unreadNotificationsCount = useAuthStore(
    (state) => state.unreadNotificationsCount,
  );

  const [activeTab, setActiveTab] = useState<DashboardTabKey>(DEFAULT_TAB);
  const [isTabHydrated, setIsTabHydrated] = useState(false);
  const [mainFilterPreset, setMainFilterPreset] =
    useState<DashboardMainDatePreset>(DEFAULT_MAIN_FILTER_PRESET);
  const [customDateRange, setCustomDateRange] = useState<DashboardDateRange>(
    () => createDefaultDashboardDateRange(),
  );
  const [lineRoomTypeFilter, setLineRoomTypeFilter] =
    useState(ALL_ROOM_TYPES_VALUE);

  useEffect(() => {
    const storedTab = window.localStorage.getItem(DASHBOARD_TAB_STORAGE_KEY);
    const frameId = window.requestAnimationFrame(() => {
      if (isDashboardTabKey(storedTab)) {
        setActiveTab(storedTab);
      }
      setIsTabHydrated(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!isTabHydrated) return;
    window.localStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, activeTab);
  }, [activeTab, isTabHydrated]);

  const shouldFetchOverview = activeTab === "overview";
  const shouldFetchOperation = activeTab === "operation";
  const shouldFetchReview = activeTab === "review";

  const effectiveDateRange = useMemo<DashboardDateRange>(() => {
    if (mainFilterPreset === "custom") {
      return customDateRange;
    }

    return resolveDateRangeFromPreset(mainFilterPreset);
  }, [customDateRange, mainFilterPreset]);

  const fromDate = effectiveDateRange[0].format("YYYY-MM-DD");
  const toDate = effectiveDateRange[1].format("YYYY-MM-DD");

  const overviewParams = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
    }),
    [fromDate, toDate],
  );

  const roomTypeRevenueParams = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
    }),
    [fromDate, toDate],
  );

  const sourceRevenueParams = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
    }),
    [fromDate, toDate],
  );

  const bookingRevenueParams = useMemo(
    () => ({
      room_type_id:
        lineRoomTypeFilter === ALL_ROOM_TYPES_VALUE
          ? undefined
          : lineRoomTypeFilter,
    }),
    [lineRoomTypeFilter],
  );

  const recentBookingsParams = useMemo<GetBookingsRequest>(
    () => ({
      page: 1,
      limit: 4,
      sort: "created_at",
      order: "desc",
    }),
    [],
  );

  const recentSupportTicketsParams = useMemo<GetSupportTicketsRequest>(
    () => ({
      page: 1,
      limit: 4,
      sort: "created_at",
      order: "desc",
    }),
    [],
  );

  const pendingSupportTicketsParams = useMemo<GetSupportTicketsRequest>(
    () => ({
      page: 1,
      limit: 1,
      status: "pending",
    }),
    [],
  );

  const inProgressSupportTicketsParams = useMemo<GetSupportTicketsRequest>(
    () => ({
      page: 1,
      limit: 1,
      status: "accepted",
    }),
    [],
  );

  const todayDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const todayBookingStatusesParams = useMemo(
    () => ({
      from_date: todayDate,
      to_date: todayDate,
    }),
    [todayDate],
  );

  const {
    data: bookingOverviewRes,
    error: bookingOverviewError,
    isFetching: isBookingOverviewFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.bookingOverview(overviewParams),
    queryFn: async () => await getDashboardBookingOverview(overviewParams),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: bookingRevenueRes,
    error: bookingRevenueError,
    isFetching: isBookingRevenueFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.bookingRevenue(bookingRevenueParams),
    queryFn: async () => await getDashboardBookingRevenue(bookingRevenueParams),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: roomTypeRevenueRes,
    error: roomTypeRevenueError,
    isFetching: isRoomTypeRevenueFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.roomTypeRevenue(roomTypeRevenueParams),
    queryFn: async () =>
      await getDashboardRoomTypeRevenue(roomTypeRevenueParams),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: sourceRevenueRes,
    error: sourceRevenueError,
    isFetching: isSourceRevenueFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.sourceRevenue(sourceRevenueParams),
    queryFn: async () => await getDashboardSourceRevenue(sourceRevenueParams),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: recentBookingsRes,
    error: recentBookingsError,
    isFetching: isRecentBookingsFetching,
  } = useQuery({
    queryKey: queryKeys.bookings.list(recentBookingsParams),
    queryFn: async () => await getBookings(recentBookingsParams),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: roomTypesRes,
    error: roomTypesError,
    isFetching: isRoomTypesFetching,
  } = useQuery({
    queryKey: queryKeys.roomTypes.basic(),
    queryFn: async () => await getRoomTypes({ view: "basic" }),
    enabled: shouldFetchOverview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: guestNationalRes,
    error: guestNationalError,
    isFetching: isGuestNationalFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.guestNational(),
    queryFn: async () => await getDashboardGuestNational(),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: serviceTypeCountRes,
    error: serviceTypeCountError,
    isFetching: isServiceTypeCountFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.serviceTypeCount(),
    queryFn: async () => await getDashboardServiceTypeCount(),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: supportTicketTimeRes,
    error: supportTicketTimeError,
    isFetching: isSupportTicketTimeFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.supportTicketTime(),
    queryFn: async () => await getDashboardSupportTicketTime(),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: recentSupportTicketsRes,
    error: recentSupportTicketsError,
    isFetching: isRecentSupportTicketsFetching,
  } = useQuery({
    queryKey: queryKeys.supportTickets.list(recentSupportTicketsParams),
    queryFn: async () => await getSupportTickets(recentSupportTicketsParams),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: pendingSupportTicketsRes,
    error: pendingSupportTicketsError,
    isFetching: isPendingSupportTicketsFetching,
  } = useQuery({
    queryKey: queryKeys.supportTickets.list(pendingSupportTicketsParams),
    queryFn: async () => await getSupportTickets(pendingSupportTicketsParams),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: inProgressSupportTicketsRes,
    error: inProgressSupportTicketsError,
    isFetching: isInProgressSupportTicketsFetching,
  } = useQuery({
    queryKey: queryKeys.supportTickets.list(inProgressSupportTicketsParams),
    queryFn: async () =>
      await getSupportTickets(inProgressSupportTicketsParams),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: todayBookingStatusesRes,
    error: todayBookingStatusesError,
    isFetching: isTodayBookingStatusesFetching,
  } = useQuery({
    queryKey: queryKeys.bookings.statuses(todayBookingStatusesParams),
    queryFn: async () => await getBookingStatuses(todayBookingStatusesParams),
    enabled: shouldFetchOperation,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewSummaryRes,
    error: reviewSummaryError,
    isFetching: isReviewSummaryFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.reviewSummary(),
    queryFn: async () => await getDashboardReviewSummary(),
    enabled: shouldFetchReview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewCategoryCountRes,
    error: reviewCategoryCountError,
    isFetching: isReviewCategoryCountFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.reviewCategoryCount(),
    queryFn: async () => await getDashboardReviewCategoryCount(),
    enabled: shouldFetchReview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewCategorySentimentRes,
    error: reviewCategorySentimentError,
    isFetching: isReviewCategorySentimentFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.reviewCategorySentiment(),
    queryFn: async () => await getDashboardReviewCategorySentiment(),
    enabled: shouldFetchReview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewSentimentCountRes,
    error: reviewSentimentCountError,
    isFetching: isReviewSentimentCountFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.reviewSentimentCount(),
    queryFn: async () => await getDashboardReviewSentimentCount(),
    enabled: shouldFetchReview,
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewSentimentTimeRes,
    error: reviewSentimentTimeError,
    isFetching: isReviewSentimentTimeFetching,
  } = useQuery({
    queryKey: queryKeys.dashboard.reviewSentimentTime(),
    queryFn: async () => await getDashboardReviewSentimentTime(),
    enabled: shouldFetchReview,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!bookingOverviewError) return;
    messageApi.errorFromApi(bookingOverviewError);
  }, [bookingOverviewError, messageApi]);

  useEffect(() => {
    if (!bookingRevenueError) return;
    messageApi.errorFromApi(bookingRevenueError);
  }, [bookingRevenueError, messageApi]);

  useEffect(() => {
    if (!roomTypeRevenueError) return;
    messageApi.errorFromApi(roomTypeRevenueError);
  }, [messageApi, roomTypeRevenueError]);

  useEffect(() => {
    if (!sourceRevenueError) return;
    messageApi.errorFromApi(sourceRevenueError);
  }, [messageApi, sourceRevenueError]);

  useEffect(() => {
    if (!recentBookingsError) return;
    messageApi.errorFromApi(recentBookingsError);
  }, [messageApi, recentBookingsError]);

  useEffect(() => {
    if (!roomTypesError) return;
    messageApi.errorFromApi(roomTypesError);
  }, [messageApi, roomTypesError]);

  useEffect(() => {
    if (!guestNationalError) return;
    messageApi.errorFromApi(guestNationalError);
  }, [guestNationalError, messageApi]);

  useEffect(() => {
    if (!serviceTypeCountError) return;
    messageApi.errorFromApi(serviceTypeCountError);
  }, [messageApi, serviceTypeCountError]);

  useEffect(() => {
    if (!supportTicketTimeError) return;
    messageApi.errorFromApi(supportTicketTimeError);
  }, [messageApi, supportTicketTimeError]);

  useEffect(() => {
    if (!recentSupportTicketsError) return;
    messageApi.errorFromApi(recentSupportTicketsError);
  }, [messageApi, recentSupportTicketsError]);

  useEffect(() => {
    if (!pendingSupportTicketsError) return;
    messageApi.errorFromApi(pendingSupportTicketsError);
  }, [messageApi, pendingSupportTicketsError]);

  useEffect(() => {
    if (!inProgressSupportTicketsError) return;
    messageApi.errorFromApi(inProgressSupportTicketsError);
  }, [inProgressSupportTicketsError, messageApi]);

  useEffect(() => {
    if (!todayBookingStatusesError) return;
    messageApi.errorFromApi(todayBookingStatusesError);
  }, [messageApi, todayBookingStatusesError]);

  useEffect(() => {
    if (!reviewSummaryError) return;
    messageApi.errorFromApi(reviewSummaryError);
  }, [messageApi, reviewSummaryError]);

  useEffect(() => {
    if (!reviewCategoryCountError) return;
    messageApi.errorFromApi(reviewCategoryCountError);
  }, [messageApi, reviewCategoryCountError]);

  useEffect(() => {
    if (!reviewCategorySentimentError) return;
    messageApi.errorFromApi(reviewCategorySentimentError);
  }, [messageApi, reviewCategorySentimentError]);

  useEffect(() => {
    if (!reviewSentimentCountError) return;
    messageApi.errorFromApi(reviewSentimentCountError);
  }, [messageApi, reviewSentimentCountError]);

  useEffect(() => {
    if (!reviewSentimentTimeError) return;
    messageApi.errorFromApi(reviewSentimentTimeError);
  }, [messageApi, reviewSentimentTimeError]);

  const bookingOverviewMetrics = bookingOverviewRes?.data?.data?.data ?? null;
  const bookingRevenueData = bookingRevenueRes?.data?.data?.data ?? null;
  const roomTypeRevenueData = useMemo(
    () => roomTypeRevenueRes?.data?.data?.data?.chart || [],
    [roomTypeRevenueRes?.data?.data?.data?.chart],
  );
  const sourceRevenueData = useMemo(
    () => sourceRevenueRes?.data?.data?.data?.chart || [],
    [sourceRevenueRes?.data?.data?.data?.chart],
  );
  const recentBookings = recentBookingsRes?.data?.data?.bookings || [];
  const roomTypes = useMemo(
    () => roomTypesRes?.data?.data?.room_types || [],
    [roomTypesRes?.data?.data?.room_types],
  );

  const normalizedRoomTypeRevenueData = useMemo(
    () => normalizeRoomTypeRevenueItems(roomTypeRevenueData),
    [roomTypeRevenueData],
  );

  const normalizedSourceRevenueData = useMemo(
    () =>
      sourceRevenueData
        .filter((item) => toSafeNumber(item.revenue, 0) > 0)
        .map((item) => ({
          ...item,
          source_id: toTrimmedString(item.source_id),
          source_name: item.source_name?.trim() || "-",
          revenue: Math.max(0, toSafeNumber(item.revenue, 0)),
          revenue_percent: Math.max(0, toSafeNumber(item.revenue_percent, 0)),
        })),
    [sourceRevenueData],
  );

  const guestNationalData = useMemo(
    () => guestNationalRes?.data?.data?.data?.chart || [],
    [guestNationalRes?.data?.data?.data?.chart],
  );

  const serviceTypeCountData = useMemo(
    () => serviceTypeCountRes?.data?.data?.data?.chart || [],
    [serviceTypeCountRes?.data?.data?.data?.chart],
  );

  const supportTicketTimeData = supportTicketTimeRes?.data?.data?.data ?? null;
  const supportTicketTimeChartData = useMemo(
    () => supportTicketTimeData?.chart || [],
    [supportTicketTimeData?.chart],
  );
  const recentSupportTickets =
    recentSupportTicketsRes?.data?.data?.support_tickets || [];

  const normalizedGuestNationalData = useMemo(
    () => normalizeGuestNationalItems(guestNationalData),
    [guestNationalData],
  );

  const normalizedServiceTypeCountData = useMemo(
    () => normalizeServiceTypeCountItems(serviceTypeCountData),
    [serviceTypeCountData],
  );

  const normalizedSupportTicketTimeData = useMemo(
    () => normalizeSupportTicketTimeItems(supportTicketTimeChartData),
    [supportTicketTimeChartData],
  );

  const averageResolutionMinutes = Math.max(
    0,
    toSafeNumber(supportTicketTimeData?.average_resolution_minutes, 0),
  );

  const operationOverviewMetrics = useMemo<OperationOverviewMetrics>(
    () => ({
      todayCheckIn:
        toNonNegativeNumber(
          todayBookingStatusesRes?.data?.data?.["checked-in"],
        ) ?? 0,
      todayCheckOut:
        toNonNegativeNumber(
          todayBookingStatusesRes?.data?.data?.["checked-out"],
        ) ?? 0,
      pendingRequests: resolveSupportTicketsTotal(
        pendingSupportTicketsRes?.data?.data,
      ),
      inProgressRequests: resolveSupportTicketsTotal(
        inProgressSupportTicketsRes?.data?.data,
      ),
      unreadMessages: toNonNegativeNumber(unreadNotificationsCount) ?? 0,
    }),
    [
      inProgressSupportTicketsRes?.data?.data,
      pendingSupportTicketsRes?.data?.data,
      todayBookingStatusesRes?.data?.data,
      unreadNotificationsCount,
    ],
  );

  const isOperationMetricCardsFetching =
    isTodayBookingStatusesFetching ||
    isPendingSupportTicketsFetching ||
    isInProgressSupportTicketsFetching;

  const reviewSummaryMetrics = reviewSummaryRes?.data?.data?.data ?? null;

  const reviewCategoryCountData = useMemo(
    () => reviewCategoryCountRes?.data?.data?.data?.chart || [],
    [reviewCategoryCountRes?.data?.data?.data?.chart],
  );

  const reviewCategorySentimentData = useMemo(
    () => reviewCategorySentimentRes?.data?.data?.data?.chart || [],
    [reviewCategorySentimentRes?.data?.data?.data?.chart],
  );

  const reviewSentimentCountData = reviewSentimentCountRes?.data?.data?.data;
  const reviewSentimentTimeData = reviewSentimentTimeRes?.data?.data?.data;

  const normalizedReviewCategoryCountData = useMemo(
    () => normalizeReviewCategoryCountItems(reviewCategoryCountData),
    [reviewCategoryCountData],
  );

  const normalizedReviewCategorySentimentData = useMemo(
    () => normalizeReviewCategorySentimentItems(reviewCategorySentimentData),
    [reviewCategorySentimentData],
  );

  const normalizedReviewSentimentCountData = useMemo(
    () => normalizeReviewSentimentCountData(reviewSentimentCountData),
    [reviewSentimentCountData],
  );

  const normalizedReviewSentimentTimeData = useMemo(
    () => normalizeReviewSentimentTimeData(reviewSentimentTimeData),
    [reviewSentimentTimeData],
  );

  const revenueRoomTypeOptions = useMemo(
    () => [
      {
        value: ALL_ROOM_TYPES_VALUE,
        label: t("charts.revenueOverTime.allRoomTypes"),
      },
      ...normalizeRoomTypes(roomTypes).map((roomType) => ({
        value: roomType.id,
        label: roomType.name,
      })),
    ],
    [roomTypes, t],
  );

  const presetOptions = useMemo(
    () =>
      DASHBOARD_MAIN_DATE_PRESET_VALUES.map((presetValue) => ({
        value: presetValue,
        label: t(`filters.presets.${presetValue}`),
      })),
    [t],
  );

  return (
    <div className="h-full">
      <div className="mb-5 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full overflow-x-auto pb-1 lg:w-auto lg:overflow-visible lg:pb-0">
          <DashboardTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            overviewLabel={t("tabs.overview")}
            operationLabel={t("tabs.operation")}
            reviewLabel={t("tabs.review")}
          />
        </div>

        {activeTab === "overview" ? (
          <div className="w-full lg:w-auto">
            <DashboardOverviewFilters
              presetValue={mainFilterPreset}
              customDateRange={customDateRange}
              presetOptions={presetOptions}
              datePlaceholder={[t("filters.fromDate"), t("filters.toDate")]}
              loading={isBookingOverviewFetching}
              onPresetChange={setMainFilterPreset}
              onCustomDateRangeChange={setCustomDateRange}
            />
          </div>
        ) : null}
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-5 pb-6">
          <OverviewMetricCards
            metrics={bookingOverviewMetrics}
            loading={isBookingOverviewFetching}
          />

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <RevenueOverTimeChart
              data={bookingRevenueData}
              roomTypeValue={lineRoomTypeFilter}
              roomTypeOptions={revenueRoomTypeOptions}
              loading={isBookingRevenueFetching || isRoomTypesFetching}
              onRoomTypeChange={(value) =>
                setLineRoomTypeFilter(value || ALL_ROOM_TYPES_VALUE)
              }
            />

            <RoomTypeRevenueChart
              items={normalizedRoomTypeRevenueData}
              loading={isRoomTypeRevenueFetching}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <RecentBookingsTable
              items={recentBookings}
              loading={isRecentBookingsFetching}
            />

            <SourceRevenueChart
              items={normalizedSourceRevenueData}
              loading={isSourceRevenueFetching}
            />
          </div>
        </div>
      ) : activeTab === "operation" ? (
        <div className="space-y-5 pb-6">
          <OperationMetricCards
            metrics={operationOverviewMetrics}
            loading={isOperationMetricCardsFetching}
          />

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <GuestNationalityChart
              items={normalizedGuestNationalData}
              loading={isGuestNationalFetching}
            />

            <SupportTicketResolutionDonutChart
              averageResolutionMinutes={averageResolutionMinutes}
              items={normalizedSupportTicketTimeData}
              loading={isSupportTicketTimeFetching}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <RecentSupportTicketsTable
              items={recentSupportTickets}
              loading={isRecentSupportTicketsFetching}
            />

            <ServiceTypeCountChart
              items={normalizedServiceTypeCountData}
              loading={isServiceTypeCountFetching}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5 pb-6">
          <ReviewMetricCards
            metrics={reviewSummaryMetrics}
            loading={isReviewSummaryFetching}
          />

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <ReviewSentimentTimeAreaChart
              data={normalizedReviewSentimentTimeData}
              loading={isReviewSentimentTimeFetching}
            />

            <ReviewSentimentDonutChart
              data={normalizedReviewSentimentCountData}
              loading={isReviewSentimentCountFetching}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
            <ReviewCategoryCountBarChart
              items={normalizedReviewCategoryCountData}
              loading={isReviewCategoryCountFetching}
            />

            <ReviewCategorySentimentStackedBarChart
              items={normalizedReviewCategorySentimentData}
              loading={isReviewCategorySentimentFetching}
            />
          </div>
        </div>
      )}
    </div>
  );
}
