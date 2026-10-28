"use client";

import { useMemo } from "react";
import { FaStar } from "react-icons/fa";
import { useLocale } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { ReviewsSummary } from "@/types/response/review";
import { resolveReviewStarColor } from "../utils/review-star-colors";

interface ReviewSummaryCardLabels {
  starLabel: (value: { star: number }) => string;
  totalReviews: (value: { count: string }) => string;
}

interface ReviewSummaryCardProps {
  summary?: ReviewsSummary | null;
  loading?: boolean;
  labels: ReviewSummaryCardLabels;
  selectedStar?: number;
  onStarToggle?: (star: number) => void;
}

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

const toPercent = (value: unknown) => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
};

export default function ReviewSummaryCard({
  summary,
  loading = false,
  labels,
  selectedStar,
  onStarToggle,
}: ReviewSummaryCardProps) {
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const countFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const totalReviews = Math.max(0, Number(summary?.all) || 0);

  const starRows = useMemo(
    () =>
      STAR_LEVELS.map((star) => {
        if (star === 5) {
          return { star, percent: toPercent(summary?.five_star_percent) };
        }
        if (star === 4) {
          return { star, percent: toPercent(summary?.four_star_percent) };
        }
        if (star === 3) {
          return { star, percent: toPercent(summary?.three_star_percent) };
        }
        if (star === 2) {
          return { star, percent: toPercent(summary?.two_star_percent) };
        }
        return { star, percent: toPercent(summary?.one_star_percent) };
      }),
    [
      summary?.five_star_percent,
      summary?.four_star_percent,
      summary?.one_star_percent,
      summary?.three_star_percent,
      summary?.two_star_percent,
    ],
  );

  const averageRating = useMemo(() => {
    const apiAverage =
      typeof summary?.average === "number" && Number.isFinite(summary.average)
        ? summary.average
        : null;
    if (apiAverage != null) return Math.max(0, Math.min(5, apiAverage));

    if (totalReviews <= 0) return 0;
    const totalPercent = starRows.reduce(
      (total, row) => total + row.percent,
      0,
    );
    if (totalPercent <= 0) return 0;

    const weightedTotal = starRows.reduce((total, row) => {
      return total + row.star * row.percent;
    }, 0);
    return weightedTotal / totalPercent;
  }, [starRows, summary, totalReviews]);

  const averageRatingText = averageRating.toLocaleString(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section className="rounded-md border border-[#d9d9d9] bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-5">
      <div className="flex items-center gap-2">
        <FaStar className="text-2xl text-[#eab308]" />
        <p className="text-xl font-bold leading-none text-[#1f2937]">
          {averageRatingText}
        </p>
        <span className="text-sm font-medium text-[#8c8c8c]">
          {labels.totalReviews({ count: countFormatter.format(totalReviews) })}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {starRows.map((row) => (
          <div key={row.star} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedStar === row.star}
              onChange={() => onStarToggle?.(row.star)}
              className="h-5 w-5 shrink-0 cursor-pointer rounded-md border border-[#bfbfbf] accent-[#1677ff]"
            />

            <span className="w-12 shrink-0 text-sm font-medium text-[#595959]">
              {labels.starLabel({ star: row.star })}
            </span>

            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ececec]">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${row.percent}%`,
                  backgroundColor: resolveReviewStarColor(row.star),
                }}
              />
            </div>

            <span className="w-12 shrink-0 text-right text-sm text-[#8c8c8c]">
              {loading ? "-" : `${percentFormatter.format(row.percent)}%`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
