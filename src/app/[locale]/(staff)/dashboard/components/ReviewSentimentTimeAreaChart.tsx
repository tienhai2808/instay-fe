"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardReviewSentimentTimeChartData } from "@/types/response/dashboard";
import { DASHBOARD_PURPLE } from "../utils/chart-setup";
import { toSafeNumber } from "../utils/dashboard-utils";
import { useIsBelowBreakpoint } from "../utils/use-is-below-breakpoint";

interface ReviewSentimentTimeAreaChartProps {
  data?: DashboardReviewSentimentTimeChartData | null;
  loading?: boolean;
}

type SentimentKey = "positive" | "neutral" | "negative";

const SENTIMENT_ORDER: SentimentKey[] = ["positive", "neutral", "negative"];

const SENTIMENT_COLORS: Record<
  SentimentKey,
  { border: string; background: string; point: string }
> = {
  positive: {
    border: "#16a34a",
    background: "rgba(22, 163, 74, 0.18)",
    point: "#16a34a",
  },
  neutral: {
    border: DASHBOARD_PURPLE,
    background: "rgba(139, 92, 246, 0.16)",
    point: DASHBOARD_PURPLE,
  },
  negative: {
    border: "#dc2626",
    background: "rgba(220, 38, 38, 0.16)",
    point: "#dc2626",
  },
};

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

export default function ReviewSentimentTimeAreaChart({
  data,
  loading = false,
}: ReviewSentimentTimeAreaChartProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";
  const dayjsLocale = locale === LOCALE_VI ? "vi" : "en";
  const isMobileViewport = useIsBelowBreakpoint(639);

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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
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
      datasets: SENTIMENT_ORDER.map((sentimentKey) => ({
        label: t(`review.sentiments.${sentimentKey}`),
        data: chartItems.map((item) =>
          Math.max(0, toSafeNumber(item[sentimentKey]?.count, 0)),
        ),
        borderColor: SENTIMENT_COLORS[sentimentKey].border,
        backgroundColor: SENTIMENT_COLORS[sentimentKey].background,
        fill: true,
        borderWidth: 2,
        tension: 0.28,
        pointRadius: isMobileViewport ? 1.8 : 2.5,
        pointHoverRadius: isMobileViewport ? 3.4 : 4.2,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: SENTIMENT_COLORS[sentimentKey].point,
        pointBorderWidth: 1.4,
      })),
    }),
    [chartItems, dayjsLocale, granularity, isMobileViewport, t],
  );

  const chartOptions = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#4b5563",
            boxWidth: 12,
            boxHeight: 12,
            font: {
              size: 11,
              weight: 600,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const sentimentKey =
                SENTIMENT_ORDER[context.datasetIndex] ?? "neutral";
              const chartItem = chartItems[context.dataIndex];
              const count = Math.max(0, toSafeNumber(context.parsed.y, 0));
              const percent = Math.max(
                0,
                toSafeNumber(chartItem?.[sentimentKey]?.percent, 0),
              );
              return `${context.dataset.label}: ${t(
                "review.charts.shared.tooltipCountPercent",
                {
                  count: countFormatter.format(count),
                  percent: percentFormatter.format(percent),
                },
              )}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "#eef2f7",
          },
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: isMobileViewport ? 4 : 8,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            precision: 0,
            font: {
              size: 10,
            },
          },
          grid: {
            color: "#e5e7eb",
          },
        },
      },
    }),
    [chartItems, countFormatter, isMobileViewport, percentFormatter, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("review.charts.sentimentTime.title")}
      </h2>

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
