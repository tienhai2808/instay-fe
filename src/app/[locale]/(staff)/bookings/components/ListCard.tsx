"use client";

import { useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dropdown, Popconfirm } from "antd";
import type { MenuProps } from "antd";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import {
  FiMail,
  FiMapPin,
  FiMoreVertical,
  FiPhone,
  FiTag,
  FiUser,
} from "react-icons/fi";
import { RiRobot2Line } from "react-icons/ri";
import type { Booking } from "@/types/data/booking";
import type { BookingStatus } from "@/types/request/booking";
import { LOCALE_VI } from "@/constants/locale";
import BookingPredictModal from "./BookingPredictModal";
import {
  canDeleteBooking,
  getBookingStatusTagClassName,
  getStatusLabelKey,
  resolveBookingQuickActions,
} from "../utils/booking-status";

interface BookingListCardProps {
  booking: Booking;
  loadingAction?: boolean;
  deleting?: boolean;
  onOpen: (id: string) => void;
  onQuickStatusUpdate: (payload: { id: string; status: BookingStatus }) => void;
  onDelete: (id: string) => void;
}

const textValueClassName = "text-lg font-semibold leading-none text-[#171717]";
const textLabelClassName = "text-sm text-[#8c8c8c]";

export default function BookingListCard({
  booking,
  loadingAction = false,
  deleting = false,
  onOpen,
  onQuickStatusUpdate,
  onDelete,
}: BookingListCardProps) {
  const t = useTranslations("BookingsPage");
  const locale = useLocale();
  const [isPredictModalOpen, setIsPredictModalOpen] = useState(false);
  const openBlockedUntilRef = useRef(0);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  );

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const displayId = booking.booking_number?.trim() || "-";
  const bookingStatus = booking.status;
  const canDelete = canDeleteBooking(booking);
  const canShowPredict = bookingStatus === "confirmed";

  const roomNames = (booking.booking_rooms || [])
    .map((bookingRoom) => bookingRoom.room?.name)
    .filter((roomName): roomName is string => Boolean(roomName))
    .join(", ");

  const quickActions = resolveBookingQuickActions(booking);

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return dateFormatter.format(parsed);
  };

  const formatPrice = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return `${amountFormatter.format(value)} VND`;
  };

  const handleOpenCard = () => {
    if (isPredictModalOpen) return;
    if (Date.now() < openBlockedUntilRef.current) return;
    onOpen(booking.id);
  };

  const handleClosePredictModal = () => {
    openBlockedUntilRef.current = Date.now() + 350;
    setIsPredictModalOpen(false);
  };

  const actionButtonClassName = (tone: "success" | "warning" | "danger") => {
    if (tone === "danger") {
      return "border-[#ff0004] bg-[#ff0004] text-white hover:border-[#e00003] hover:bg-[#e00003]";
    }

    if (tone === "success") {
      return "border-[#22c55e] bg-[#22c55e] text-white hover:border-[#16a34a] hover:bg-[#16a34a]";
    }

    return "border-[#ff7a14] bg-[#ff7a14] text-white hover:border-[#e86b0b] hover:bg-[#e86b0b]";
  };

  const actionLabel = (status: BookingStatus) => {
    if (status === "cancelled") return t("actions.cancel");
    if (status === "checked-in") return t("detailPage.statusActions.checkIn");
    return t("detailPage.statusActions.checkOut");
  };

  const actionMenuItems: MenuProps["items"] = [
    {
      key: "edit",
      label: t("actions.edit"),
      onClick: () => onOpen(booking.id),
      icon: <BiEditAlt className="text-base! text-blue-500" />,
    },
    ...(canDelete
      ? [
          {
            key: "delete",
            label: (
              <Popconfirm
                title={t("detailPage.deleteModal.title")}
                description={t("detailPage.deleteModal.description")}
                onConfirm={() => {
                  onDelete(booking.id);
                }}
                okText={t("detailPage.deleteModal.confirm")}
                cancelText={t("actions.cancel")}
                okButtonProps={{ danger: true }}
              >
                <span>{t("actions.delete")}</span>
              </Popconfirm>
            ),
            icon: <BiTrashAlt className="text-base! text-red-500" />,
          },
        ]
      : []),
  ];

  return (
    <div
      className="rounded-md border border-[#d9d9d9] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[#cfcfcf]"
      role="button"
      tabIndex={0}
      onClick={handleOpenCard}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleOpenCard();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className={textValueClassName}>{displayId}</p>

          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold ${getBookingStatusTagClassName(bookingStatus)}`}
          >
            {t(getStatusLabelKey(bookingStatus || "confirmed"))}
          </span>
        </div>

        <div className="inline-flex items-center gap-2">
          {canShowPredict && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsPredictModalOpen(true);
              }}
              aria-label={t("predict.buttonAria")}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#c7d2fe] bg-[#eef2ff] text-[#4338ca] transition hover:border-[#a5b4fc] hover:bg-[#e0e7ff]"
            >
              <RiRobot2Line className="text-lg" />
            </button>
          )}

          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: actionMenuItems,
            }}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
              }}
              aria-label={t("actions.more")}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-100"
            >
              <FiMoreVertical className="text-xl" />
            </button>
          </Dropdown>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-[#8c8c8c] md:grid-cols-2 xl:grid-cols-5">
        <div className="inline-flex items-center gap-2 text-sm">
          <FiUser className="text-base" />
          <span>{booking.guest_full_name || "-"}</span>
        </div>

        <div className="inline-flex items-center gap-2 text-sm">
          <FiPhone className="text-base" />
          <span>{booking.guest_phone || "-"}</span>
        </div>

        <div className="inline-flex items-center gap-2 text-sm">
          <FiMail className="text-base" />
          <span>{booking.guest_email || "-"}</span>
        </div>

        <div className="inline-flex items-center gap-2 text-sm">
          <FiTag className="text-base" />
          <span>
            {t("card.source")}: {booking.source?.name || "-"}
          </span>
        </div>

        <div className="inline-flex items-center gap-2 text-sm">
          <FiMapPin className="text-base" />
          <span>
            {t("card.branch")}: {booking.branch?.name || "-"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.roomType")}</p>
          <p className="truncate font-semibold text-[#171717]">
            {booking.room_type?.name || "-"}
          </p>
        </div>

        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.roomNumber")}</p>
          <p className="font-semibold text-[#171717]">
            {booking.room_number != null ? booking.room_number : "-"}
          </p>
        </div>

        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.rooms")}</p>
          <p
            className="truncate font-semibold text-[#171717]"
            title={roomNames || "-"}
          >
            {roomNames || "-"}
          </p>
        </div>

        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.checkIn")}</p>
          <p className="font-semibold text-[#171717]">
            {formatDate(booking.check_in)}
          </p>
        </div>

        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.checkOut")}</p>
          <p className="font-semibold text-[#171717]">
            {formatDate(booking.check_out)}
          </p>
        </div>

        <div className="min-w-0">
          <p className={textLabelClassName}>{t("card.total")}</p>
          <p className="font-semibold text-[#8b5cf6]">
            {formatPrice(booking.total_sell_price)}
          </p>
        </div>

        <div className="col-span-2 flex items-end justify-start gap-2 lg:col-span-1 lg:justify-end">
          {quickActions.map((action) => (
            <button
              key={action.nextStatus}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuickStatusUpdate({
                  id: booking.id,
                  status: action.nextStatus,
                });
              }}
              disabled={loadingAction || deleting}
              className={`min-w-[120px] rounded-sm border px-4 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${actionButtonClassName(action.tone)}`}
            >
              {actionLabel(action.nextStatus)}
            </button>
          ))}
        </div>
      </div>

      <BookingPredictModal
        open={isPredictModalOpen}
        onClose={handleClosePredictModal}
        predict={booking.predict}
        bookingNumber={displayId}
      />
    </div>
  );
}
