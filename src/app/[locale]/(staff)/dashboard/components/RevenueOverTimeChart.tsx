"use client";

import { useMemo } from "react";
import { Empty, Select, Spin } from "antd";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardBookingRevenueChartData } from "@/types/response/dashboard";
import { DASHBOARD_PURPLE, DASHBOARD_PURPLE_LIGHT } from "../utils/chart-setup";
import { toCompactNumber, toSafeNumber } from "../utils/dashboard-utils";
import { useIsBelowBreakpoint } from "../utils/use-is-below-breakpoint";

interface RevenueOverTimeRoomTypeOption {
  label: string;
  value: string;
}

interface RevenueOverTimeChartProps {
  data?: DashboardBookingRevenueChartData | null;
  roomTypeValue?: string;
  roomTypeOptions: RevenueOverTimeRoomTypeOption[];
  loading?: boolean;
  onRoomTypeChange: (value?: string) => void;
}

const formatXAxisLabel = (
  value: string | undefined,
  granularity: string,
  locale: string,
) => {
  if (!value) return "-";
  const parsed = dayjs(value).locale(locale);
  if (!parsed.isValid()) return "-";

  const normalizedGranularity = granularity.trim().toLowerCase();

  if (normalizedGranularity === "year") {
    return parsed.format("YYYY");
  }

  if (normalizedGranularity === "quarter") {
    const quarter = Math.floor(parsed.month() / 3) + 1;
    return `Q${quarter}/${parsed.format("YYYY")}`;
  }

  if (normalizedGranularity === "month") {
    return parsed.format("MM/YYYY");
  }

  if (normalizedGranularity === "week") {
    return parsed.format("DD/MM");
  }

  return parsed.format("DD/MM");
};

export default function RevenueOverTimeChart({
  data,
  roomTypeValue,
  roomTypeOptions,
  loading = false,
  onRoomTypeChange,
}: RevenueOverTimeChartProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";
  const dayjsLocale = locale === LOCALE_VI ? "vi" : "en";
  const isMobileViewport = useIsBelowBreakpoint(639);

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const chartItems = useMemo(() => data?.chart || [], [data?.chart]);
  const granularity = data?.granularity || "day";
  const hasData = chartItems.length > 0;

  const chartData = useMemo(
    () => ({
      labels: chartItems.map((item) =>
        formatXAxisLabel(item.date, granularity, dayjsLocale),
      ),
      datasets: [
        {
          label: t("charts.revenueOverTime.title"),
          data: chartItems.map((item) =>
            Math.max(0, toSafeNumber(item.revenue, 0)),
          ),
          borderColor: DASHBOARD_PURPLE,
          backgroundColor: DASHBOARD_PURPLE_LIGHT,
          fill: false,
          borderWidth: 2,
          tension: 0.3,
          pointRadius: isMobileViewport ? 2 : 3,
          pointHoverRadius: isMobileViewport ? 4 : 5,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: DASHBOARD_PURPLE,
          pointBorderWidth: 1.5,
        },
      ],
    }),
    [chartItems, dayjsLocale, granularity, isMobileViewport, t],
  );

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 4,
          right: 8,
        },
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = toSafeNumber(context.parsed.y, 0);
              return `${amountFormatter.format(value)} VND`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "#e5e7eb",
          },
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
              weight: "normal",
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? 4 : 8,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "#e5e7eb",
          },
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
              weight: "normal",
            },
            maxTicksLimit: isMobileViewport ? 5 : 8,
            callback: (value) => toCompactNumber(toSafeNumber(value, 0)),
          },
        },
      },
    }),
    [amountFormatter, isMobileViewport],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-md font-bold text-[#111827]">
          {t("charts.revenueOverTime.title")}
        </h2>

        <Select
          size="large"
          allowClear
          placeholder={t("charts.revenueOverTime.roomTypePlaceholder")}
          value={roomTypeValue}
          options={roomTypeOptions}
          onChange={(value) => onRoomTypeChange(value)}
          className="w-full text-sm! sm:w-[230px]"
          disabled={loading}
        />
      </div>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="h-[280px] sm:h-[340px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center sm:h-[340px]">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
