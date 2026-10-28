import { isOfflineSourceName } from "../components/Form";
import type { Booking } from "@/types/data/booking";
import type { BookingStatus } from "@/types/request/booking";

export type BookingStatusFilterValue = "all" | BookingStatus;

export interface BookingQuickActionConfig {
  nextStatus: BookingStatus;
  tone: "success" | "warning" | "danger";
}

export const BOOKING_STATUS_FILTER_ORDER: BookingStatusFilterValue[] = [
  "all",
  "checked-in",
  "confirmed",
  "checked-out",
  "cancelled",
];

export const getStatusLabelKey = (status: BookingStatusFilterValue) => {
  if (status === "all") return "statuses.all";
  if (status === "checked-in") return "statuses.checkedIn";
  if (status === "checked-out") return "statuses.checkedOut";
  if (status === "cancelled") return "statuses.cancelled";
  return "statuses.confirmed";
};

export const getBookingStatusTagClassName = (status?: BookingStatus) => {
  if (status === "checked-in") {
    return "border-[#7ad9d0] bg-[#e9faf8] text-[#16b8a9]";
  }
  if (status === "checked-out") {
    return "border-[#d9d9d9] bg-[#f5f5f5] text-[#6b6b6b]";
  }
  if (status === "cancelled") {
    return "border-[#ffcdc7] bg-[#fff1f0] text-[#ff4d4f]";
  }

  return "border-[#91caff] bg-[#f0f7ff] text-[#1677ff]";
};

const statusChipToneClassNames: Record<BookingStatusFilterValue, string> = {
  all: "border-[#91caff] bg-[#f0f7ff] text-[#1677ff]",
  confirmed: "border-[#91caff] bg-[#f0f7ff] text-[#1677ff]",
  "checked-in": "border-[#7ad9d0] bg-[#e9faf8] text-[#16b8a9]",
  "checked-out": "border-[#d9d9d9] bg-[#f5f5f5] text-[#6b6b6b]",
  cancelled: "border-[#ffcdc7] bg-[#fff1f0] text-[#ff4d4f]",
};

export const getStatusListFilterChipClassName = (
  status: BookingStatusFilterValue,
  active: boolean,
) => {
  const baseClassName =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-semibold transition cursor-pointer";

  if (active) {
    return `${baseClassName} ${statusChipToneClassNames[status]} shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]`;
  }

  return `${baseClassName} ${statusChipToneClassNames[status]} opacity-85 hover:opacity-100`;
};

export const canDeleteBooking = (booking: Booking) => {
  if (!isOfflineSourceName(booking.source?.name)) return false;
  return booking.status !== "checked-in" && booking.status !== "checked-out";
};

export const resolveBookingQuickActions = (booking: Booking) => {
  if (booking.status === "confirmed") {
    const actions: BookingQuickActionConfig[] = [
      {
        nextStatus: "cancelled",
        tone: "danger",
      },
    ];

    return actions;
  }

  if (booking.status === "checked-in") {
    return [
      {
        nextStatus: "checked-out",
        tone: "warning",
      },
    ] as BookingQuickActionConfig[];
  }

  return [] as BookingQuickActionConfig[];
};
