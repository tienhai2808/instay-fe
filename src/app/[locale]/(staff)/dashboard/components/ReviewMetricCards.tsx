"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FaRegCommentDots, FaStar } from "react-icons/fa";
import { MdThumbDownOffAlt, MdThumbUpOffAlt } from "react-icons/md";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardReviewSummaryMetrics } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";

interface ReviewMetricCardsProps {
  metrics?: DashboardReviewSummaryMetrics | null;
  loading?: boolean;
}

type ReviewMetricCardKey =
  | "totalReviews"
  | "averageStar"
  | "positiveRate"
  | "negativeRate";

export default function ReviewMetricCards({
  metrics,
  loading = false,
}: ReviewMetricCardsProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const integerFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [language],
  );

  const cards: Array<{
    key: ReviewMetricCardKey;
    value: string;
    icon: ReactNode;
    iconClassName: string;
  }> = [
    {
      key: "totalReviews",
      value: integerFormatter.format(
        Math.max(0, toSafeNumber(metrics?.review_count, 0)),
      ),
      icon: <FaRegCommentDots className="h-5 w-5" />,
      iconClassName: "bg-[#eef2ff] text-[#4f46e5]",
    },
    {
      key: "averageStar",
      value: `${decimalFormatter.format(
        Math.max(0, Math.min(5, toSafeNumber(metrics?.average_star, 0))),
      )}/5`,
      icon: <FaStar className="h-5 w-5" />,
      iconClassName: "bg-[#fef9c3] text-[#ca8a04]",
    },
    {
      key: "positiveRate",
      value: `${percentFormatter.format(
        Math.max(0, toSafeNumber(metrics?.positive_rate, 0)),
      )}%`,
      icon: <MdThumbUpOffAlt className="h-5 w-5" />,
      iconClassName: "bg-[#ecfdf3] text-[#16a34a]",
    },
    {
      key: "negativeRate",
      value: `${percentFormatter.format(
        Math.max(0, toSafeNumber(metrics?.negative_rate, 0)),
      )}%`,
      icon: <MdThumbDownOffAlt className="h-5 w-5" />,
      iconClassName: "bg-[#fee2e2] text-[#dc2626]",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.key}
          className="rounded-xl border border-[#e5e7eb] px-3 py-5 sm:px-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6b7280]">
                {t(`review.cards.${card.key}.title`)}
              </p>
              <p className="text-[20px] leading-none font-bold text-[#111827]">
                {loading ? "-" : card.value}
              </p>
            </div>

            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.iconClassName}`}
            >
              {card.icon}
            </span>
          </div>
        </article>
      ))}
    </section>
  );
}
