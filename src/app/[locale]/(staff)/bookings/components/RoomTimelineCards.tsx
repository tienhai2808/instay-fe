"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Empty } from "antd";
import { useLocale } from "next-intl";
import { FiMoreVertical } from "react-icons/fi";
import { FaRegClock } from "react-icons/fa";
import { LOCALE_VI } from "@/constants/locale";
import type {
  RoomTimelineRoom,
  RoomsTimelineResponseData,
} from "@/types/response/room";

interface RoomTimelineCardsProps {
  data?: RoomsTimelineResponseData;
  emptyText: string;
  labels: {
    priceLabel: string;
    book: string;
    sourceBookingFallback: string;
    checkInLabel: string;
    checkOutLabel: string;
    roomUnit: string;
  };
  onOpenBooking: (bookingId: string) => void;
  onBookRoom: (roomId: string) => void;
}

type RoomCardVariant =
  | "available"
  | "occupied"
  | "upcoming_checkin"
  | "overdue_checkout"
  | "overdue_checkin";

const UPCOMING_CHECKIN_WINDOW_MINUTES = 60;

const toValidDayjs = (value?: string) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const formatMoneyVnd = (value: number, locale: string) => {
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  return `${formatter.format(value)}đ`;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatHhMmSs = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const restSeconds = safeSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(restSeconds)}`;
};

const formatHoursMinutes = (minutes: number, locale: "vi" | "en") => {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const restMinutes = safeMinutes % 60;
  if (locale === "vi") {
    if (hours > 0 && restMinutes > 0) return `${hours} giờ ${restMinutes} phút`;
    if (hours > 0) return `${hours} giờ`;
    return `${restMinutes} phút`;
  }

  if (hours > 0 && restMinutes > 0) return `${hours}h ${restMinutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${restMinutes}m`;
};

const resolveRoomVariant = (room: RoomTimelineRoom, now: dayjs.Dayjs) => {
  if (!room.booking) return "available" as const;

  const status = room.booking.status;
  const checkIn = toValidDayjs(room.booking.check_in);
  const checkOut = toValidDayjs(room.booking.check_out);

  if (status === "checked-in") {
    if (checkOut && now.isAfter(checkOut)) return "overdue_checkout" as const;
    return "occupied" as const;
  }

  if (status === "confirmed") {
    if (checkIn && now.isAfter(checkIn)) return "overdue_checkin" as const;

    if (checkIn) {
      const minutesToCheckIn = checkIn.diff(now, "minute", true);
      if (minutesToCheckIn <= UPCOMING_CHECKIN_WINDOW_MINUTES) {
        return "upcoming_checkin" as const;
      }
    }

    return "upcoming_checkin" as const;
  }

  return "occupied" as const;
};

const resolveCardClassName = (variant: RoomCardVariant) => {
  if (variant === "available") {
    return "border-[#d9d9d9] bg-white text-[#262626]";
  }

  if (variant === "overdue_checkin") {
    return "border-[#ff4d4f] bg-white text-[#262626]";
  }

  if (variant === "upcoming_checkin") {
    return "border-[#8254e6] bg-[#8254e6] text-white";
  }

  return "border-[#1f64e8] bg-[#1f64e8] text-white";
};

const resolveKebabClassName = (variant: RoomCardVariant) => {
  if (variant === "available" || variant === "overdue_checkin") {
    return "text-[#262626] hover:bg-[#f5f5f5]";
  }
  return "text-white hover:bg-white/15";
};

const resolveClockPillTone = (variant: RoomCardVariant) => {
  if (variant === "overdue_checkout") {
    return {
      iconBg: "bg-[#ff4d4f]",
      text: "text-[#ff4d4f]",
    };
  }

  return {
    iconBg: "bg-[#fa8c16]",
    text: "text-[#fa8c16]",
  };
};

const formatStayProgress = (
  now: dayjs.Dayjs,
  checkIn: dayjs.Dayjs | null,
  checkOut: dayjs.Dayjs | null,
  locale: "vi" | "en",
) => {
  if (!checkIn || !checkOut) return null;

  const elapsedMinutes = now.diff(checkIn, "minute");
  const plannedMinutes = Math.max(checkOut.diff(checkIn, "minute"), 0);

  const elapsedText = formatHoursMinutes(elapsedMinutes, locale);
  const plannedHours = Math.max(Math.round(plannedMinutes / 60), 0);

  if (locale === "vi") return `${elapsedText} / ${plannedHours} giờ`;
  return `${elapsedText} / ${plannedHours}h`;
};

const formatCountdownToCheckIn = (
  now: dayjs.Dayjs,
  checkIn: dayjs.Dayjs | null,
  locale: "vi" | "en",
) => {
  if (!checkIn) return null;
  const diffSeconds = checkIn.diff(now, "second");
  if (diffSeconds <= 0) return null;

  if (diffSeconds < 24 * 3600) return formatHhMmSs(diffSeconds);
  const diffMinutes = checkIn.diff(now, "minute");
  return formatHoursMinutes(diffMinutes, locale);
};

const roomCardGridClassName = "flex flex-wrap items-stretch gap-4";
const roomCardItemClassName =
  "w-full flex-none sm:basis-[calc((100%-16px)/2)] sm:max-w-[calc((100%-16px)/2)] md:basis-[calc((100%-32px)/3)] md:max-w-[calc((100%-32px)/3)] lg:basis-[calc((100%-48px)/4)] lg:max-w-[calc((100%-48px)/4)] xl:basis-[calc((100%-64px)/5)] xl:max-w-[calc((100%-64px)/5)]";

function CardRow({
  left,
  right,
  className = "",
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  const hasLeft = left != null;
  const hasRight = right != null;
  const justifyClassName =
    hasLeft && hasRight ? "justify-between" : "justify-end";

  return (
    <div className={`flex items-center gap-3 ${justifyClassName} ${className}`}>
      {hasLeft && <div className="min-w-0 flex-1">{left}</div>}
      {hasRight && <div className="shrink-0 text-right">{right}</div>}
    </div>
  );
}

function RoomCard({
  room,
  roomTypeName,
  now,
  labels,
  onOpenBooking,
  onBookRoom,
}: {
  room: RoomTimelineRoom;
  roomTypeName: string;
  now: dayjs.Dayjs;
  labels: RoomTimelineCardsProps["labels"];
  onOpenBooking: RoomTimelineCardsProps["onOpenBooking"];
  onBookRoom: RoomTimelineCardsProps["onBookRoom"];
}) {
  const locale = useLocale();
  const lang = locale === LOCALE_VI ? "vi" : "en";

  const variant = resolveRoomVariant(room, now);
  const cardClassName = resolveCardClassName(variant);
  const kebabClassName = resolveKebabClassName(variant);

  const booking = room.booking;
  const checkIn = toValidDayjs(booking?.check_in);
  const checkOut = toValidDayjs(booking?.check_out);

  const clickable = Boolean(booking?.booking_id);

  const clockText =
    variant === "upcoming_checkin"
      ? formatCountdownToCheckIn(now, checkIn, lang)
      : booking?.status === "checked-in"
        ? formatStayProgress(now, checkIn, checkOut, lang)
        : null;

  const showClock = Boolean(clockText);
  const clockTone = resolveClockPillTone(variant);
  const reserveClockSlot = Boolean(booking);

  const priceText =
    typeof room.price === "number"
      ? formatMoneyVnd(room.price, locale === LOCALE_VI ? "vi-VN" : "en-US")
      : "-";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => {
        if (!clickable) return;
        onOpenBooking(String(booking?.booking_id));
      }}
      onKeyDown={(event) => {
        if (!clickable) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenBooking(String(booking?.booking_id));
        }
      }}
      className={`min-h-[188px] rounded-2xl border shadow-sm transition ${
        clickable ? "cursor-pointer hover:brightness-[0.99]" : ""
      } ${cardClassName}`}
    >
      <div className="px-3 py-2">
        <div className="flex items-start justify-end">
          <button
            type="button"
            className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition ${kebabClassName}`}
            aria-label="More"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <FiMoreVertical className="text-lg" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <CardRow
            left={
              <p
                className={`truncate text-2xl font-bold leading-none ${
                  variant === "available" || variant === "overdue_checkin"
                    ? "text-[#262626]"
                    : "text-white"
                }`}
              >
                {room.room_name || "-"}
              </p>
            }
            right={
              <p
                title={roomTypeName}
                className={`max-w-[132px] truncate text-base font-semibold ${
                  variant === "available" || variant === "overdue_checkin"
                    ? "text-[#595959]"
                    : "text-white/90"
                }`}
              >
                {roomTypeName}
              </p>
            }
          />

          <CardRow
            left={
              booking?.source_name ? (
                <p
                  className={`truncate text-[10px] font-medium ${
                    variant === "available" || variant === "overdue_checkin"
                      ? "text-[#8c8c8c]"
                      : "text-white/85"
                  }`}
                >
                  {booking.source_name || labels.sourceBookingFallback}
                </p>
              ) : undefined
            }
            right={
              <p
                className={`text-sm ${
                  variant === "available" || variant === "overdue_checkin"
                    ? "text-[#595959]"
                    : "text-white/85"
                }`}
              >
                {labels.priceLabel}: {priceText}
              </p>
            }
          />

          {booking?.guest_name && (
            <CardRow
              left={
                <p
                  className={`truncate text-sm font-semibold leading-tight ${
                    variant === "available" || variant === "overdue_checkin"
                      ? "text-[#262626]"
                      : "text-white"
                  }`}
                >
                  {booking.guest_name}
                </p>
              }
            />
          )}

          {(variant === "upcoming_checkin" || variant === "overdue_checkin") &&
            checkIn && (
              <CardRow
                left={
                  <span
                    className={`text-xs ${
                      variant === "overdue_checkin"
                        ? "text-[#8c8c8c]"
                        : "text-white/80"
                    }`}
                  >
                    {labels.checkInLabel}
                  </span>
                }
                right={
                  <span
                    className={`text-xs ${
                      variant === "overdue_checkin"
                        ? "text-[#8c8c8c]"
                        : "text-white/80"
                    }`}
                  >
                    {checkIn.format("HH:mm YYYY-MM-DD")}
                  </span>
                }
              />
            )}

          {(variant === "occupied" || variant === "overdue_checkout") &&
            checkOut && (
              <CardRow
                left={
                  <span className="text-xs text-white/80">
                    {labels.checkOutLabel}
                  </span>
                }
                right={
                  <span className="text-xs text-white/80">
                    {checkOut.format("HH:mm YYYY-MM-DD")}
                  </span>
                }
              />
            )}
        </div>

        {reserveClockSlot && (
          <div className="mt-3 mb-1 flex h-8 items-start justify-start">
            {showClock ? (
              <div
                className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold ${clockTone.text}`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${clockTone.iconBg}`}
                >
                  <FaRegClock className="text-[10px] text-white" />
                </span>
                <span className="leading-none">{clockText}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {variant === "available" && (
        <div className="px-4 pb-3 pt-12">
          <button
            type="button"
            className="w-full rounded-xl cursor-pointer bg-[#8b5cf6] py-3 text-sm font-semibold text-white transition hover:bg-violet-600 active:bg-violet-700"
            onClick={(event) => {
              event.stopPropagation();
              onBookRoom(String(room.room_id));
            }}
          >
            {labels.book}
          </button>
        </div>
      )}
    </div>
  );
}

export default function RoomTimelineCards({
  data,
  emptyText,
  labels,
  onOpenBooking,
  onBookRoom,
}: RoomTimelineCardsProps) {
  const serverNow = useMemo(
    () => toValidDayjs(data?.server_now),
    [data?.server_now],
  );
  const serverNowMs = serverNow?.valueOf();
  const [now, setNow] = useState(() => serverNow ?? dayjs());

  useEffect(() => {
    if (typeof serverNowMs !== "number") return;

    const timeoutId = window.setTimeout(() => {
      setNow(dayjs(serverNowMs));
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [serverNowMs]);

  const groups = useMemo(() => data?.timeline ?? [], [data?.timeline]);
  const hasLiveClockCards = useMemo(
    () =>
      groups.some((group) =>
        (group.rooms || []).some((room) => {
          const status = room.booking?.status;
          return status === "checked-in" || status === "confirmed";
        }),
      ),
    [groups],
  );

  useEffect(() => {
    if (!hasLiveClockCards) return;

    const intervalId = window.setInterval(() => {
      setNow((prev) => prev.add(1, "second"));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasLiveClockCards]);

  const hasRooms = groups.some((group) => (group.rooms?.length || 0) > 0);

  if (!hasRooms) {
    return (
      <div className="min-h-[260px] w-full flex items-center justify-center rounded-sm bg-[#f5f5f5] p-4 shadow-sm">
        <Empty description={emptyText} />
      </div>
    );
  }

  return (
    <div className="rounded-sm bg-[#f5f5f5] p-3 shadow-sm sm:p-4 mb-8">
      <div className="flex flex-col gap-6 pb-2">
        {groups.map((group) => {
          const rooms = group.rooms || [];
          if (rooms.length === 0) return null;

          const roomCount = group.rooms_count ?? rooms.length;
          const roomTypeName = group.room_type_name || "-";
          return (
            <div key={String(group.room_type_id)}>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[#262626]">
                <span className="min-w-0 truncate" title={roomTypeName}>
                  {roomTypeName}
                </span>
                <span className="shrink-0">
                  ({roomCount} {labels.roomUnit})
                </span>
              </h3>
              <div className="mt-4">
                <div className={roomCardGridClassName}>
                  {rooms.map((room) => (
                    <div
                      key={String(room.room_id)}
                      className={roomCardItemClassName}
                    >
                      <RoomCard
                        room={room}
                        roomTypeName={roomTypeName}
                        now={now}
                        labels={labels}
                        onOpenBooking={onOpenBooking}
                        onBookRoom={onBookRoom}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
