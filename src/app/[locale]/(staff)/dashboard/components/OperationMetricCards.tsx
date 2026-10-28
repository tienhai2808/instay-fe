"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiBell, FiClock, FiSettings } from "react-icons/fi";
import { LOCALE_VI } from "@/constants/locale";
import { toSafeNumber } from "../utils/dashboard-utils";
import { TbLogin, TbLogout } from "react-icons/tb";

export interface OperationOverviewMetrics {
  todayCheckIn?: number;
  todayCheckOut?: number;
  pendingRequests?: number;
  inProgressRequests?: number;
  unreadMessages?: number;
}

interface OperationMetricCardsProps {
  metrics?: OperationOverviewMetrics | null;
  loading?: boolean;
}

type CardKey =
  | "todayCheckIn"
  | "todayCheckOut"
  | "pendingRequests"
  | "inProgressRequests"
  | "unreadMessages";

export default function OperationMetricCards({
  metrics,
  loading = false,
}: OperationMetricCardsProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const cards: Array<{
    key: CardKey;
    icon: ReactNode;
    iconClassName: string;
    value: unknown;
  }> = [
    {
      key: "todayCheckIn",
      icon: <TbLogin className="h-5 w-5" />,
      iconClassName: "bg-[#eef2ff] text-[#4f46e5]",
      value: metrics?.todayCheckIn,
    },
    {
      key: "todayCheckOut",
      icon: <TbLogout className="h-5 w-5" />,
      iconClassName: "bg-[#eef2ff] text-[#4f46e5]",
      value: metrics?.todayCheckOut,
    },
    {
      key: "pendingRequests",
      icon: <FiClock className="h-[18px] w-[18px]" />,
      iconClassName: "bg-[#fff7ed] text-[#f97316]",
      value: metrics?.pendingRequests,
    },
    {
      key: "inProgressRequests",
      icon: <FiSettings className="h-[18px] w-[18px]" />,
      iconClassName: "bg-[#ecfdf3] text-[#16a34a]",
      value: metrics?.inProgressRequests,
    },
    {
      key: "unreadMessages",
      icon: <FiBell className="h-[18px] w-[18px]" />,
      iconClassName: "bg-[#fff7ed] text-[#f97316]",
      value: metrics?.unreadMessages,
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.key}
          className="rounded-xl border border-[#e5e7eb] px-3 py-5 sm:px-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#6b7280]">
                {t(`operation.cards.${card.key}.title`)}
              </p>
              <p className="text-[20px] leading-none font-bold text-[#111827]">
                {loading
                  ? "-"
                  : numberFormatter.format(
                      Math.max(0, toSafeNumber(card.value, 0)),
                    )}
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
