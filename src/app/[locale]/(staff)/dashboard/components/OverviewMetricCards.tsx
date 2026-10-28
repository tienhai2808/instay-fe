"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardBookingOverviewMetrics } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";
import { BsCashStack } from "react-icons/bs";
import { MdCancelPresentation, MdOutlineBed } from "react-icons/md";
import { IoMdBed } from "react-icons/io";

interface OverviewMetricCardsProps {
  metrics?: DashboardBookingOverviewMetrics | null;
  loading?: boolean;
}

type CardKey =
  | "totalRevenue"
  | "occupancyRate"
  | "cancellationRate"
  | "averageDaysStay";

export default function OverviewMetricCards({
  metrics,
  loading = false,
}: OverviewMetricCardsProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
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

  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const formatSignedPercent = (value: unknown) => {
    const safeValue = toSafeNumber(value);
    const signPrefix = safeValue > 0 ? "+" : "";
    return `${signPrefix}${percentFormatter.format(safeValue)}%`;
  };

  const cards: Array<{
    key: CardKey;
    icon: ReactNode;
    iconClassName: string;
    valueText: string;
    changeValue: unknown;
  }> = [
    {
      key: "totalRevenue",
      icon: <BsCashStack className="h-6 w-6" />,
      iconClassName: "bg-[#dcfce7] text-[#16a34a]",
      valueText: `${currencyFormatter.format(
        Math.max(0, toSafeNumber(metrics?.total_revenue)),
      )} VND`,
      changeValue: metrics?.total_revenue_change_percent,
    },
    {
      key: "occupancyRate",
      icon: <MdOutlineBed className="h-6 w-6" />,
      iconClassName: "bg-[#dbeafe] text-[#2563eb]",
      valueText: `${percentFormatter.format(
        Math.max(0, toSafeNumber(metrics?.occupancy_rate)),
      )}%`,
      changeValue: metrics?.occupancy_rate_change_percent,
    },
    {
      key: "cancellationRate",
      icon: <MdCancelPresentation className="h-6 w-6" />,
      iconClassName: "bg-[#fee2e2] text-[#dc2626]",
      valueText: `${percentFormatter.format(
        Math.max(0, toSafeNumber(metrics?.cancellation_rate)),
      )}%`,
      changeValue: metrics?.cancellation_rate_change_percent,
    },
    {
      key: "averageDaysStay",
      icon: <IoMdBed className="h-6 w-6" />,
      iconClassName: "bg-[#ffedd5] text-[#ea580c]",
      valueText: decimalFormatter.format(
        Math.max(0, toSafeNumber(metrics?.average_days_stay)),
      ),
      changeValue: metrics?.average_days_stay_change_percent,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const change = toSafeNumber(card.changeValue);
        const isIncrease = change > 0;
        const isDecrease = change < 0;

        const trendClassName = isIncrease
          ? "bg-[#dcfce7] text-[#16a34a]"
          : isDecrease
            ? "bg-[#fee2e2] text-[#dc2626]"
            : "bg-[#f3f4f6] text-[#6b7280]";

        const trendIcon = isIncrease ? "↑" : isDecrease ? "↓" : "•";

        return (
          <article
            key={card.key}
            className="rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="mt-2 text-sm font-semibold text-[#6b7280]">
                  {t(`cards.${card.key}.title`)}
                </p>
                <p className="text-xl font-bold leading-tight text-[#111827] sm:text-2xl">
                  {loading ? "-" : card.valueText}
                </p>
              </div>

              <div
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${card.iconClassName}`}
              >
                {card.icon}
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold ${trendClassName}`}
              >
                <span>{trendIcon}</span>
                <span>
                  {loading ? "-" : formatSignedPercent(card.changeValue)}
                </span>
              </span>
              <span className="text-xs text-[#9ca3af]">
                {t("cards.compareLabel")}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
