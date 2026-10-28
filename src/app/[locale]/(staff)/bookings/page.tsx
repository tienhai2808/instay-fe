"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Pagination, Spin } from "antd";
import dayjs from "dayjs";
import { FiPlus } from "react-icons/fi";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBooking,
  getBookings,
  getBookingStatuses,
  getBookingTimeline,
  updateBookingStatus,
} from "@/apis/booking";
import { getBasicBranches } from "@/apis/branch";
import { getRoomTypes } from "@/apis/room_type";
import { getSources } from "@/apis/source";
import { getFloors } from "@/apis/floor";
import { getRoomsTimeline } from "@/apis/room_list";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type {
  BookingStatus,
  GetBookingsRequest,
  GetBookingTimelineRequest,
} from "@/types/request/booking";
import type { GetRoomsTimelineRequest } from "@/types/request/room";
import type { GetRoomTypesRequest } from "@/types/request/room_type";
import type { GetFloorsRequest } from "@/types/request/floor";
import type { Source } from "@/types/data/source";
import type { RoomType } from "@/types/data/room_type";
import type { Floor } from "@/types/data/floor";
import type { BasicBranch } from "@/types/data/branch";
import type {
  BookingStatusesResponseData,
  BookingsResponseData,
  BookingTimelineResponseData,
} from "@/types/response/booking";
import type { RoomsTimelineResponseData } from "@/types/response/room";
import BookingListCard from "./components/ListCard";
import BookingTimelineFilter, {
  type BookingTimelineDateRange,
} from "./components/ChartFilter";
import BookingTimelineStatusChips from "./components/ChartStatusChips";
import BookingRoomsTimelineFilter from "./components/CardFilter";
import RoomTimelineStatusChips from "./components/CardStatusChips";
import BookingListFilter, {
  type BookingListDateRange,
} from "./components/ListFilter";
import BookingStatusFilterChips from "./components/StatusListFilterChips";
import BookingTimelineChart from "./components/TimelineChart";
import RoomTimelineCards from "./components/RoomTimelineCards";
import {
  BOOKING_STATUS_FILTER_ORDER,
  type BookingStatusFilterValue,
  getStatusLabelKey,
} from "./utils/booking-status";
import BookingViewModeSwitch, {
  type BookingViewMode,
} from "./components/ViewModeSwitch";

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
};

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

const normalizeBookingsResponse = (
  payload: BookingsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const bookings = payload?.bookings || [];
  const pagination = payload?.meta || payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);

  const estimatedTotalFromData = Math.max(
    (page - 1) * limit + bookings.length,
    bookings.length,
  );
  const total = totalFromApi ?? estimatedTotalFromData;
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasPrev = pagination?.has_prev ?? page > 1;
  const hasNext = pagination?.has_next ?? page < totalPages;

  return {
    bookings,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

const normalizeSource = (source: Source): Source => ({
  ...source,
  id: String(source.id),
});

const normalizeRoomType = (roomType: RoomType): RoomType => ({
  ...roomType,
  id: String(roomType.id),
});

const normalizeFloor = (floor: Floor): Floor => ({
  ...floor,
  id: String(floor.id),
});

const normalizeBranch = (branch: BasicBranch): BasicBranch => ({
  ...branch,
  id: String(branch.id),
});

const DEFAULT_TIMELINE_RANGE_DAYS = 7;
const BOOKINGS_VIEW_MODE_STORAGE_KEY = "bookings:view-mode";

const isBookingViewMode = (value: string | null): value is BookingViewMode =>
  value === "list" || value === "chart" || value === "card";

const getInitialBookingViewMode = (): BookingViewMode => {
  if (typeof window === "undefined") return "list";
  const stored = window.localStorage.getItem(BOOKINGS_VIEW_MODE_STORAGE_KEY);
  return isBookingViewMode(stored) ? stored : "list";
};

const createDefaultTimelineDateRange = (): BookingTimelineDateRange => {
  const fromDate = dayjs().startOf("day");
  const toDate = fromDate.add(DEFAULT_TIMELINE_RANGE_DAYS - 1, "day");
  return [fromDate, toDate];
};

export default function BookingsPage() {
  const t = useTranslations("BookingsPage");
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [dateRangeValue, setDateRangeValue] =
    useState<BookingListDateRange>(null);
  const [sourceFilter, setSourceFilter] = useState<string>();
  const [branchFilter, setBranchFilter] = useState<string>();
  const [statusFilter, setStatusFilter] =
    useState<BookingStatusFilterValue>("all");
  const [viewMode, setViewMode] = useState<BookingViewMode>(() =>
    getInitialBookingViewMode(),
  );
  const [timelineRoomTypeFilter, setTimelineRoomTypeFilter] =
    useState<string>();
  const [timelineBranchFilter, setTimelineBranchFilter] = useState<string>();
  const [timelineDateRangeValue, setTimelineDateRangeValue] =
    useState<BookingTimelineDateRange>(() => createDefaultTimelineDateRange());
  const [cardSearchValue, setCardSearchValue] = useState("");
  const [appliedCardSearch, setAppliedCardSearch] = useState("");
  const [cardBranchFilter, setCardBranchFilter] = useState<string>();
  const [cardRoomTypeFilter, setCardRoomTypeFilter] = useState<string>();
  const [cardFloorFilter, setCardFloorFilter] = useState<string>();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [updatingBookingId, setUpdatingBookingId] = useState<string>();
  const [deletingBookingId, setDeletingBookingId] = useState<string>();

  const fromDate = dateRangeValue?.[0]?.format("YYYY-MM-DD") || undefined;
  const toDate = dateRangeValue?.[1]?.format("YYYY-MM-DD") || undefined;
  const timelineFromDate = timelineDateRangeValue[0].format("YYYY-MM-DD");
  const timelineToDate = timelineDateRangeValue[1].format("YYYY-MM-DD");

  useEffect(() => {
    window.localStorage.setItem(BOOKINGS_VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

  const bookingListParams = useMemo<GetBookingsRequest>(
    () => ({
      page,
      limit,
      sort: "created_at",
      order: "desc",
      from_date: fromDate,
      to_date: toDate,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: appliedSearch || undefined,
      source_id: sourceFilter || undefined,
      branch_id: branchFilter || undefined,
    }),
    [
      appliedSearch,
      branchFilter,
      fromDate,
      limit,
      page,
      sourceFilter,
      statusFilter,
      toDate,
    ],
  );

  const bookingStatusParams = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      search: appliedSearch || undefined,
      source_id: sourceFilter || undefined,
      branch_id: branchFilter || undefined,
    }),
    [appliedSearch, branchFilter, fromDate, sourceFilter, toDate],
  );

  const bookingTimelineParams = useMemo<GetBookingTimelineRequest>(
    () => ({
      from_date: timelineFromDate,
      to_date: timelineToDate,
      room_type_id: timelineRoomTypeFilter || undefined,
      branch_id: timelineBranchFilter || undefined,
    }),
    [
      timelineBranchFilter,
      timelineFromDate,
      timelineRoomTypeFilter,
      timelineToDate,
    ],
  );

  const roomsTimelineParams = useMemo<GetRoomsTimelineRequest>(
    () => ({
      search: appliedCardSearch || undefined,
      branch_id: cardBranchFilter || undefined,
      room_type_id: cardRoomTypeFilter || undefined,
      floor_id: cardFloorFilter || undefined,
    }),
    [appliedCardSearch, cardBranchFilter, cardFloorFilter, cardRoomTypeFilter],
  );

  const roomTypeParams = useMemo<GetRoomTypesRequest>(
    () => ({
      view: "basic",
      branch_id:
        viewMode === "chart"
          ? timelineBranchFilter || undefined
          : viewMode === "card"
            ? cardBranchFilter || undefined
            : undefined,
    }),
    [cardBranchFilter, timelineBranchFilter, viewMode],
  );

  const floorParams = useMemo<GetFloorsRequest>(
    () => ({
      view: "basic",
      branch_id: cardBranchFilter || undefined,
    }),
    [cardBranchFilter],
  );

  const {
    data: bookingsRes,
    isFetching: isBookingsFetching,
    error: bookingsError,
  } = useQuery({
    queryKey: queryKeys.bookings.list(bookingListParams),
    queryFn: async () => getBookings(bookingListParams),
    enabled: viewMode === "list",
    placeholderData: (previousData) => previousData,
  });

  const {
    data: bookingStatusesRes,
    isFetching: isStatusesFetching,
    error: statusesError,
  } = useQuery({
    queryKey: queryKeys.bookings.statuses(bookingStatusParams),
    queryFn: async () => getBookingStatuses(bookingStatusParams),
    enabled: viewMode === "list",
    placeholderData: (previousData) => previousData,
  });

  const {
    data: sourcesRes,
    isFetching: isSourcesFetching,
    error: sourcesError,
  } = useQuery({
    queryKey: queryKeys.sources.basic(),
    queryFn: async () => getSources({ view: "basic" }),
    enabled: viewMode === "list",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: branchesRes,
    isFetching: isBranchesFetching,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: async () => getBasicBranches(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: roomTypesRes,
    isFetching: isRoomTypesFetching,
    error: roomTypesError,
  } = useQuery({
    queryKey: queryKeys.roomTypes.list(roomTypeParams),
    queryFn: async () => getRoomTypes(roomTypeParams),
    enabled: viewMode === "chart" || viewMode === "card",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: bookingTimelineRes,
    isFetching: isTimelineFetching,
    error: timelineError,
  } = useQuery({
    queryKey: queryKeys.bookings.timeline(bookingTimelineParams),
    queryFn: async () => getBookingTimeline(bookingTimelineParams),
    enabled: viewMode === "chart",
    placeholderData: (previousData) => previousData,
  });

  const {
    data: floorsRes,
    isFetching: isFloorsFetching,
    error: floorsError,
  } = useQuery({
    queryKey: queryKeys.floors.list(floorParams),
    queryFn: async () => getFloors(floorParams),
    enabled: viewMode === "card",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: roomsTimelineRes,
    isFetching: isRoomsTimelineFetching,
    error: roomsTimelineError,
  } = useQuery({
    queryKey: queryKeys.rooms.timeline(roomsTimelineParams),
    queryFn: async () => getRoomsTimeline(roomsTimelineParams),
    enabled: viewMode === "card",
    placeholderData: (previousData) => previousData,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (bookingsError) {
      messageApi.errorFromApi(bookingsError);
    }
  }, [bookingsError, messageApi]);

  useEffect(() => {
    if (statusesError) {
      messageApi.errorFromApi(statusesError);
    }
  }, [messageApi, statusesError]);

  useEffect(() => {
    if (sourcesError) {
      messageApi.errorFromApi(sourcesError);
    }
  }, [messageApi, sourcesError]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (roomTypesError) {
      messageApi.errorFromApi(roomTypesError);
    }
  }, [messageApi, roomTypesError]);

  useEffect(() => {
    if (timelineError) {
      messageApi.errorFromApi(timelineError);
    }
  }, [messageApi, timelineError]);

  useEffect(() => {
    if (floorsError) {
      messageApi.errorFromApi(floorsError);
    }
  }, [floorsError, messageApi]);

  useEffect(() => {
    if (roomsTimelineError) {
      messageApi.errorFromApi(roomsTimelineError);
    }
  }, [messageApi, roomsTimelineError]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchValue.trim();
      setPage((prevPage) => (prevPage === 1 ? prevPage : 1));
      setAppliedSearch((prevSearch) =>
        prevSearch === nextSearch ? prevSearch : nextSearch,
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue]);

  useEffect(() => {
    if (viewMode !== "card") return;

    const timeoutId = window.setTimeout(() => {
      const nextSearch = cardSearchValue.trim();
      setAppliedCardSearch((prevSearch) =>
        prevSearch === nextSearch ? prevSearch : nextSearch,
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cardSearchValue, viewMode]);

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: { id: string; status: BookingStatus }) =>
      updateBookingStatus(variables.id, { status: variables.status }),
    onMutate: async (variables) => {
      setUpdatingBookingId(variables.id);
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
    onSettled: () => {
      setUpdatingBookingId(undefined);
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => deleteBooking(id),
    onMutate: async (id) => {
      setDeletingBookingId(id);
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
    onSettled: () => {
      setDeletingBookingId(undefined);
    },
  });

  const normalized = useMemo(
    () => normalizeBookingsResponse(bookingsRes?.data?.data, page, limit),
    [bookingsRes?.data?.data, limit, page],
  );

  const bookings = normalized.bookings;
  const listLoading = isBookingsFetching || isStatusesFetching;
  const listFilterLoading =
    listLoading || isSourcesFetching || isBranchesFetching;
  const chartLoading = isTimelineFetching;
  const chartFilterLoading =
    chartLoading || isBranchesFetching || isRoomTypesFetching;
  const timelineData = bookingTimelineRes?.data?.data as
    | BookingTimelineResponseData
    | undefined;
  const cardLoading = isRoomsTimelineFetching;
  const roomsTimelineData = roomsTimelineRes?.data?.data as
    | RoomsTimelineResponseData
    | undefined;
  const sourceOptions = useMemo(
    () =>
      (sourcesRes?.data?.data?.sources || []).map((source) => {
        const normalizedSource = normalizeSource(source);
        return {
          value: normalizedSource.id,
          label: normalizedSource.name || `#${normalizedSource.id}`,
        };
      }),
    [sourcesRes?.data?.data?.sources],
  );
  const branchOptions = useMemo(
    () =>
      (branchesRes?.data?.data?.branches || []).map((branch) => {
        const normalizedBranch = normalizeBranch(branch);
        return {
          value: normalizedBranch.id,
          label: normalizedBranch.name || `#${normalizedBranch.id}`,
        };
      }),
    [branchesRes?.data?.data?.branches],
  );
  const roomTypeOptions = useMemo(
    () =>
      (roomTypesRes?.data?.data?.room_types || []).map((roomType) => {
        const normalizedRoomType = normalizeRoomType(roomType);
        return {
          value: normalizedRoomType.id,
          label: normalizedRoomType.name || `#${normalizedRoomType.id}`,
        };
      }),
    [roomTypesRes?.data?.data?.room_types],
  );
  const floorOptions = useMemo(
    () =>
      (floorsRes?.data?.data?.floors || []).map((floor) => {
        const normalizedFloor = normalizeFloor(floor);
        const floorName = normalizedFloor.name || `#${normalizedFloor.id}`;
        const branchName = normalizedFloor.branch?.name?.trim();

        return {
          value: normalizedFloor.id,
          label: branchName ? `${floorName} - ${branchName}` : floorName,
        };
      }),
    [floorsRes?.data?.data?.floors],
  );

  const statusCounts = useMemo(() => {
    const payload = bookingStatusesRes?.data?.data as
      | BookingStatusesResponseData
      | undefined;

    return {
      all: toNonNegativeNumber(payload?.all) ?? normalized.total,
      "checked-in": toNonNegativeNumber(payload?.["checked-in"]) ?? 0,
      confirmed: toNonNegativeNumber(payload?.confirmed) ?? 0,
      "checked-out": toNonNegativeNumber(payload?.["checked-out"]) ?? 0,
      cancelled: toNonNegativeNumber(payload?.cancelled) ?? 0,
    } as const;
  }, [bookingStatusesRes?.data?.data, normalized.total]);

  const statusFilterOptions = useMemo(
    () =>
      BOOKING_STATUS_FILTER_ORDER.map((statusValue) => ({
        value: statusValue,
        label: t(getStatusLabelKey(statusValue)),
        count: statusCounts[statusValue],
      })),
    [statusCounts, t],
  );

  const openCreate = () => {
    router.push("/bookings/create");
  };

  const openCreateForRoom = (roomId: string) => {
    router.push(`/bookings/create?room_id=${encodeURIComponent(roomId)}`);
  };

  const openBookingDetails = (id: string) => {
    router.push(`/bookings/${id}`);
  };

  const handleDateRangeChange = (value: BookingListDateRange) => {
    setPage(1);
    setDateRangeValue(value);
  };

  const handleSourceFilterChange = (value?: string) => {
    setPage(1);
    setSourceFilter(value);
  };

  const handleBranchFilterChange = (value?: string) => {
    setPage(1);
    setBranchFilter(value);
  };

  const handleTimelineBranchFilterChange = (value?: string) => {
    setTimelineBranchFilter(value);
    setTimelineRoomTypeFilter(undefined);
  };

  const handleTimelineRoomTypeFilterChange = (value?: string) => {
    setTimelineRoomTypeFilter(value);
  };

  const handleTimelineDateRangeChange = (value: BookingTimelineDateRange) => {
    setTimelineDateRangeValue(value);
  };

  const handleCardRoomTypeFilterChange = (value?: string) => {
    setCardRoomTypeFilter(value);
  };

  const handleCardBranchFilterChange = (value?: string) => {
    setCardBranchFilter(value);
    setCardRoomTypeFilter(undefined);
    setCardFloorFilter(undefined);
  };

  const handleCardFloorFilterChange = (value?: string) => {
    setCardFloorFilter(value);
  };

  const handleStatusFilterChange = (value: BookingStatusFilterValue) => {
    if (value === statusFilter) return;
    setPage(1);
    setStatusFilter(value);
  };

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== limit) {
      setLimit(nextPageSize);
      setPage(1);
      return;
    }

    if (nextPage > normalized.page && !normalized.hasNext) return;
    if (nextPage < normalized.page && !normalized.hasPrev) return;
    setPage(nextPage);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl mb-1 font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>

        <button
          onClick={openCreate}
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] sm:w-auto"
        >
          <FiPlus className="text-sm" />
          {t("actions.create")}
        </button>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        {viewMode === "chart" ? (
          <BookingTimelineFilter
            loading={chartFilterLoading}
            branchValue={timelineBranchFilter}
            roomTypeValue={timelineRoomTypeFilter}
            dateRangeValue={timelineDateRangeValue}
            onBranchChange={handleTimelineBranchFilterChange}
            onRoomTypeChange={handleTimelineRoomTypeFilterChange}
            onDateRangeChange={handleTimelineDateRangeChange}
            branchOptions={branchOptions}
            roomTypeOptions={roomTypeOptions}
            branchPlaceholder={t("filters.branch")}
            roomTypePlaceholder={t("filters.roomType")}
            datePlaceholder={[t("filters.fromDate"), t("filters.toDate")]}
          />
        ) : viewMode === "card" ? (
          <BookingRoomsTimelineFilter
            loading={
              isBranchesFetching || isRoomTypesFetching || isFloorsFetching
            }
            searchValue={cardSearchValue}
            branchIdValue={cardBranchFilter}
            roomTypeIdValue={cardRoomTypeFilter}
            floorIdValue={cardFloorFilter}
            onSearchChange={setCardSearchValue}
            onBranchChange={handleCardBranchFilterChange}
            onRoomTypeChange={handleCardRoomTypeFilterChange}
            onFloorChange={handleCardFloorFilterChange}
            branchOptions={branchOptions}
            roomTypeOptions={roomTypeOptions}
            floorOptions={floorOptions}
            labels={{
              searchPlaceholder: t("roomTimeline.searchPlaceholder"),
              branchPlaceholder: t("filters.branch"),
              roomTypePlaceholder: t("filters.roomType"),
              floorPlaceholder: t("roomTimeline.filters.floor"),
            }}
          />
        ) : (
          <BookingListFilter
            loading={listFilterLoading}
            searchValue={searchValue}
            sourceValue={sourceFilter}
            branchValue={branchFilter}
            dateRangeValue={dateRangeValue}
            onSearchChange={setSearchValue}
            onSourceChange={handleSourceFilterChange}
            onBranchChange={handleBranchFilterChange}
            onDateRangeChange={handleDateRangeChange}
            sourceOptions={sourceOptions}
            branchOptions={branchOptions}
            searchPlaceholder={t("searchPlaceholder")}
            sourcePlaceholder={t("filters.source")}
            branchPlaceholder={t("filters.branch")}
            datePlaceholder={[t("filters.fromDate"), t("filters.toDate")]}
          />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {viewMode === "chart" ? (
          <BookingTimelineStatusChips
            status={timelineData?.status}
            labels={{
              all: t("chart.tags.all"),
              available: t("chart.tags.available"),
              occupied: t("chart.tags.occupied"),
              booked: t("chart.tags.booked"),
            }}
          />
        ) : viewMode === "card" ? (
          <RoomTimelineStatusChips
            status={roomsTimelineData?.status}
            labels={{
              all: t("roomTimeline.statuses.all"),
              available: t("roomTimeline.statuses.available"),
              occupied: t("roomTimeline.statuses.occupied"),
              upcoming_checkin: t("roomTimeline.statuses.upcomingCheckin"),
              overdue_checkout: t("roomTimeline.statuses.overdueCheckout"),
              overdue_checkin: t("roomTimeline.statuses.overdueCheckin"),
            }}
          />
        ) : (
          <BookingStatusFilterChips
            value={statusFilter}
            options={statusFilterOptions}
            onChange={handleStatusFilterChange}
          />
        )}

        <BookingViewModeSwitch
          value={viewMode}
          onChange={setViewMode}
          labels={{
            list: t("views.list"),
            chart: t("views.chart"),
            card: t("views.card"),
          }}
        />
      </div>

      <div className="mt-4">
        {viewMode === "chart" ? (
          <Spin spinning={chartLoading} size="large">
            <BookingTimelineChart
              data={timelineData}
              emptyText={t("empty")}
              roomTypeFallbackLabel={t("chart.roomTypeFallback")}
              roomFallbackLabel={t("chart.roomFallback")}
              onOpenBooking={openBookingDetails}
            />
          </Spin>
        ) : viewMode === "card" ? (
          <Spin spinning={cardLoading && !roomsTimelineData} size="large">
            <RoomTimelineCards
              data={roomsTimelineData}
              emptyText={t("empty")}
              labels={{
                priceLabel: t("roomTimeline.labels.price"),
                book: t("roomTimeline.actions.book"),
                sourceBookingFallback: t("roomTimeline.labels.sourceBooking"),
                checkInLabel: t("roomTimeline.labels.checkIn"),
                checkOutLabel: t("roomTimeline.labels.checkOut"),
                roomUnit: t("roomTimeline.labels.roomUnit"),
              }}
              onOpenBooking={openBookingDetails}
              onBookRoom={openCreateForRoom}
            />
          </Spin>
        ) : viewMode === "list" ? (
          <Spin spinning={listLoading} size="large">
            {bookings.length === 0 && !listLoading ? (
              <div className="min-h-[260px] w-full flex items-center justify-center">
                <Empty description={t("empty")} />
              </div>
            ) : (
              <div className="rounded-sm bg-[#f5f5f5] p-3 shadow-sm">
                <div className="flex flex-col gap-3">
                  {bookings.map((booking) => (
                    <BookingListCard
                      key={booking.id}
                      booking={booking}
                      loadingAction={
                        updateStatusMutation.isPending &&
                        updatingBookingId === booking.id
                      }
                      deleting={
                        deleteBookingMutation.isPending &&
                        deletingBookingId === booking.id
                      }
                      onOpen={openBookingDetails}
                      onQuickStatusUpdate={(payload) => {
                        updateStatusMutation.mutate(payload);
                      }}
                      onDelete={(id) => {
                        deleteBookingMutation.mutate(id);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </Spin>
        ) : (
          <div className="min-h-[260px] w-full flex items-center justify-center rounded-xl bg-[#f5f5f5] p-4 shadow-sm">
            <Empty description={t("views.comingSoon")} />
          </div>
        )}
      </div>

      {viewMode === "list" && normalized.total > 0 && (
        <div className="mt-6 flex justify-end pb-8">
          <Pagination
            current={normalized.page}
            pageSize={normalized.limit}
            total={normalized.total}
            onChange={handlePaginationChange}
            onShowSizeChange={(_, nextSize) => {
              handlePaginationChange(1, nextSize);
            }}
            showSizeChanger
            hideOnSinglePage={false}
            pageSizeOptions={[10, 20, 50, 100]}
            showTotal={(total, range) =>
              t("pagination", {
                from: range[0],
                to: range[1],
                total,
              })
            }
            className="[&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-pagination-item-active>a]:!text-white [&_.ant-pagination-total-text]:!text-[#8c8c8c]"
          />
        </div>
      )}
    </div>
  );
}
