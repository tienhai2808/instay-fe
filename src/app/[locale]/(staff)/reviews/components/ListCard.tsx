"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Rate } from "antd";
import { useLocale } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { GuestReview } from "@/types/data/review";
import { resolveReviewStarColor } from "../utils/review-star-colors";

interface ReviewListCardLabels {
  roomPrefix: string;
  unknownGuest: string;
  unknownDate: string;
  emptyContent: string;
}

interface ReviewListCardProps {
  review: GuestReview;
  labels: ReviewListCardLabels;
}

export default function ReviewListCard({
  review,
  labels,
}: ReviewListCardProps) {
  const locale = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  const createdAtText = useMemo(() => {
    if (!review.created_at) return labels.unknownDate;
    const date = new Date(review.created_at);
    if (Number.isNaN(date.getTime())) return labels.unknownDate;
    return dateFormatter.format(date);
  }, [dateFormatter, labels.unknownDate, review.created_at]);

  const roomName = review.booking_room?.room?.name?.trim();
  const bookingId = review.booking_room?.booking?.id?.trim();
  const guestLabel =
    review.booking_room?.booking?.guest_email?.trim() ||
    review.booking_room?.booking?.guest_full_name?.trim() ||
    labels.unknownGuest;
  const normalizedStar = Math.max(0, Math.min(5, Number(review.star) || 0));

  return (
    <article className="rounded-md border border-[#d9d9d9] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="min-w-0 truncate text-lg font-semibold text-[#1f2937]">
          {guestLabel}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[#8c8c8c]">
          {roomName ? (
            bookingId ? (
              <Link
                href={`/bookings/${bookingId}`}
                className="font-medium text-[#595959] underline-offset-2 hover:text-[#262626] hover:underline"
              >
                {labels.roomPrefix} {roomName}
              </Link>
            ) : (
              <span className="font-medium text-[#595959]">
                {labels.roomPrefix} {roomName}
              </span>
            )
          ) : null}

          {roomName ? <span>•</span> : null}
          <span>{createdAtText}</span>
        </div>
      </div>

      <Rate
        disabled
        value={normalizedStar}
        className="text-xl!"
        style={{ color: resolveReviewStarColor(normalizedStar) }}
      />

      <p className="mt-1 whitespace-pre-line text-base leading-8 text-[#4b5563]">
        {review.content?.trim() || labels.emptyContent}
      </p>
    </article>
  );
}
