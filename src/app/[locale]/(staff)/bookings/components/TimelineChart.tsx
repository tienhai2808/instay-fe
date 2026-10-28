"use client";

import { useMemo } from "react";
import { Empty } from "antd";
import dayjs from "dayjs";
import { useLocale } from "next-intl";
import { BsQuestion } from "react-icons/bs";
import { FiCheck } from "react-icons/fi";
import { LOCALE_VI } from "@/constants/locale";
import type { BookingStatus } from "@/types/request/booking";
import type {
  BookingTimelineEvent,
  BookingTimelineResponseData,
} from "@/types/response/booking";

interface BookingTimelineChartProps {
  data?: BookingTimelineResponseData;
  emptyText: string;
  roomTypeFallbackLabel: string;
  roomFallbackLabel: string;
  onOpenBooking: (bookingId: string) => void;
}

interface TimelineRange {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  endExclusive: dayjs.Dayjs;
  daysCount: number;
  timelineMinWidth: number;
  durationMs: number;
}

const LEFT_COLUMN_WIDTH = 148;
const DAY_COLUMN_MIN_WIDTH = 128;
const HEADER_HEIGHT = 64;
const GROUP_HEADER_HEIGHT = 40;
const ROOM_ROW_HEIGHT = 40;

const toDayStart = (value?: string) => {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return null;
  return parsed.startOf("day");
};

const toDayjs = (value?: string) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const resolveStatusIcon = (status?: BookingStatus) => {
  if (status === "checked-in") {
    return <FiCheck className="text-[10px] leading-none" />;
  }

  if (status === "confirmed") {
    return <BsQuestion className="text-[10px] leading-none" />;
  }

  return null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getRange = (data?: BookingTimelineResponseData): TimelineRange | null => {
  const startDate = toDayStart(data?.start_date);
  const endDate = toDayStart(data?.end_date);

  if (!startDate || !endDate) return null;
  if (endDate.isBefore(startDate, "day")) return null;

  const daysCount = endDate.diff(startDate, "day") + 1;
  const endExclusive = startDate.add(daysCount, "day");
  const durationMs = endExclusive.diff(startDate, "millisecond");
  if (daysCount <= 0 || durationMs <= 0) return null;

  return {
    startDate,
    endDate,
    endExclusive,
    daysCount,
    timelineMinWidth: daysCount * DAY_COLUMN_MIN_WIDTH,
    durationMs,
  };
};

const getEventPosition = (
  event: BookingTimelineEvent,
  range: TimelineRange,
) => {
  const startTime = toDayjs(event.check_in);
  const endTime = toDayjs(event.check_out);
  if (!startTime || !endTime) return null;

  if (
    !endTime.isAfter(range.startDate) ||
    !startTime.isBefore(range.endExclusive)
  ) {
    return null;
  }

  const clampedStart = startTime.isBefore(range.startDate)
    ? range.startDate
    : startTime;
  const clampedEnd = endTime.isAfter(range.endExclusive)
    ? range.endExclusive
    : endTime;

  const segmentMs = clampedEnd.diff(clampedStart, "millisecond");
  const startOffsetMs = clampedStart.diff(range.startDate, "millisecond");
  const endOffsetMs = startOffsetMs + segmentMs;
  const leftPercent = clamp((startOffsetMs / range.durationMs) * 100, 0, 100);
  const endPercent = clamp((endOffsetMs / range.durationMs) * 100, 0, 100);

  return {
    leftPercent,
    rightPercent: 100 - Math.max(leftPercent, endPercent),
    startsBeforeOrAtNow: !clampedStart.isAfter(dayjs()),
  };
};

const getNowLinePosition = (range: TimelineRange) => {
  const now = dayjs();
  if (now.isBefore(range.startDate) || !now.isBefore(range.endExclusive)) {
    return null;
  }

  const offsetMs = now.diff(range.startDate, "millisecond");
  return clamp((offsetMs / range.durationMs) * 100, 0, 100);
};

export default function BookingTimelineChart({
  data,
  emptyText,
  roomTypeFallbackLabel,
  roomFallbackLabel,
  onOpenBooking,
}: BookingTimelineChartProps) {
  const locale = useLocale();
  const range = useMemo(() => getRange(data), [data]);

  const roomGroups = data?.chart || [];

  const nowLineLeftPx = useMemo(
    () => (range ? getNowLinePosition(range) : null),
    [range],
  );

  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        weekday: "short",
      }),
    [locale],
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
      }),
    [locale],
  );

  if (!range) {
    return (
      <div className="min-h-[280px] w-full flex items-center justify-center rounded-sm bg-[#f5f5f5] p-4 shadow-sm">
        <Empty description={emptyText} />
      </div>
    );
  }

  const hasRows = roomGroups.some((group) => (group.rooms?.length || 0) > 0);
  if (!hasRows) {
    return (
      <div className="min-h-[280px] w-full flex items-center justify-center rounded-sm bg-[#f5f5f5] p-4 shadow-sm">
        <Empty description={emptyText} />
      </div>
    );
  }

  const dayColumns = Array.from({ length: range.daysCount }).map((_, index) => {
    const date = range.startDate.add(index, "day");
    const isToday = date.isSame(dayjs(), "day");
    return {
      key: date.format("YYYY-MM-DD"),
      isToday,
      weekDay: weekdayFormatter.format(date.toDate()),
      day: dayFormatter.format(date.toDate()),
    };
  });

  return (
    <div className="rounded-sm bg-[#f5f5f5] p-2 shadow-sm sm:p-3 mb-8">
      <div className="overflow-x-auto">
        <div className="w-fit min-w-full">
          <div
            className="relative overflow-hidden rounded-sm border border-[#d9d9d9] bg-white"
            style={{
              minWidth: LEFT_COLUMN_WIDTH + range.timelineMinWidth,
            }}
          >
            {nowLineLeftPx != null && (
              <div
                className="pointer-events-none absolute z-30"
                style={{
                  left: LEFT_COLUMN_WIDTH,
                  right: 0,
                  top: HEADER_HEIGHT,
                  bottom: 0,
                }}
              >
                <div
                  className="absolute top-0 bottom-0"
                  style={{ left: `${nowLineLeftPx}%` }}
                >
                  <div className="absolute left-0 top-0 -translate-x-1/2">
                    <div className="inline-flex items-center rounded-full bg-[#8b5cf6] px-2 py-0.5 text-[10px] font-semibold text-white">
                      {dayjs().format("HH:mm")}
                    </div>
                  </div>
                  <div className="h-full border-l-2 border-dashed border-[#8b5cf6]/80" />
                </div>
              </div>
            )}

            <div className="relative z-10 flex border-b border-[#d9d9d9]">
              <div
                className="shrink-0 border-r border-[#d9d9d9] bg-[#f5f5f5]"
                style={{ width: LEFT_COLUMN_WIDTH, height: HEADER_HEIGHT }}
              />
              <div
                className="flex min-w-0 flex-1"
                style={{ minWidth: range.timelineMinWidth }}
              >
                {dayColumns.map((column) => (
                  <div
                    key={column.key}
                    className={`flex min-w-0 flex-1 flex-col items-center justify-center border-r border-[#d9d9d9] text-xs ${
                      column.isToday
                        ? "bg-[#0a0a0a] text-white"
                        : "bg-white text-[#8c8c8c]"
                    }`}
                    style={{
                      minWidth: DAY_COLUMN_MIN_WIDTH,
                      height: HEADER_HEIGHT,
                    }}
                  >
                    <span className="text-xs font-medium">
                      {column.weekDay}
                    </span>
                    <span className="mt-1 text-xl leading-none font-semibold">
                      {column.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {roomGroups.map((group) => (
              <div key={String(group.room_type_id)} className="relative">
                <div
                  className="w-full border-b border-[#d9d9d9] bg-[#f0f0f0] px-4 flex items-center text-sm font-semibold text-[#262626]"
                  style={{ height: GROUP_HEADER_HEIGHT }}
                >
                  <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                    <span className="min-w-0 flex-1 truncate">
                      {group.room_type_name || roomTypeFallbackLabel}
                    </span>
                    <span className="shrink-0">
                      ({group.rooms_count ?? group.rooms?.length ?? 0})
                    </span>
                  </div>
                </div>

                {(group.rooms || []).map((room) => (
                  <div
                    key={String(room.room_id)}
                    className="flex border-b border-[#e8e8e8]"
                  >
                    <div
                      className="shrink-0 px-4 flex items-center border-r border-[#e8e8e8] text-sm font-semibold text-[#262626] bg-white"
                      style={{
                        width: LEFT_COLUMN_WIDTH,
                        height: ROOM_ROW_HEIGHT,
                      }}
                    >
                      {room.room_name || roomFallbackLabel}
                    </div>
                    <div
                      className="relative shrink-0 border-r border-[#e8e8e8] bg-white"
                      style={{
                        width: "auto",
                        minWidth: range.timelineMinWidth,
                        flex: "1 1 auto",
                        height: ROOM_ROW_HEIGHT,
                      }}
                    >
                      <div className="pointer-events-none absolute inset-0 flex">
                        {dayColumns.map((column) => (
                          <div
                            key={`grid-${room.room_id}-${column.key}`}
                            className="min-w-0 flex-1 border-r border-[#e8e8e8]"
                            style={{ minWidth: DAY_COLUMN_MIN_WIDTH }}
                          />
                        ))}
                      </div>

                      {(room.events || []).map((event) => {
                        const position = getEventPosition(event, range);
                        if (!position) return null;

                        const bookingId = String(event.booking_id);
                        const statusIcon = resolveStatusIcon(event.status);

                        return (
                          <button
                            key={`${bookingId}-${event.check_in}-${event.check_out}`}
                            type="button"
                            onClick={() => onOpenBooking(bookingId)}
                            className={`absolute top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-2 rounded-md px-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 ${
                              position.startsBeforeOrAtNow
                                ? "bg-[#1f64e8]"
                                : "bg-[#8254e6]"
                            }`}
                            style={{
                              left: `${position.leftPercent}%`,
                              right: `${position.rightPercent}%`,
                              minWidth: 32,
                            }}
                            title={event.title || bookingId}
                          >
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white/90" />
                            <span className="min-w-0 flex-1 truncate text-left">
                              {event.title || event.booking_number || bookingId}
                            </span>
                            {statusIcon && (
                              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/95 bg-white/20 text-white">
                                {statusIcon}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
