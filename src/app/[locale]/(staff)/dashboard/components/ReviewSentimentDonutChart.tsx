"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import type { ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardReviewSentimentCountChartData } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";
import "../utils/chart-setup";

interface ReviewSentimentDonutChartProps {
  data?: DashboardReviewSentimentCountChartData | null;
  loading?: boolean;
}

type SentimentKey = "positive" | "neutral" | "negative";

const SENTIMENT_ORDER: SentimentKey[] = ["positive", "neutral", "negative"];

const SENTIMENT_COLORS: Record<SentimentKey, string> = {
  positive: "#16a34a",
  neutral: "#8b5cf6",
  negative: "#dc2626",
};

export default function ReviewSentimentDonutChart({
  data,
  loading = false,
}: ReviewSentimentDonutChartProps) {
  const t = useTranslations("DashboardPage");
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [language],
  );

  const sentimentItems = useMemo(
    () =>
      SENTIMENT_ORDER.map((sentimentKey) => ({
        key: sentimentKey,
        label: t(`review.sentiments.${sentimentKey}`),
        count: Math.max(0, toSafeNumber(data?.[sentimentKey]?.count, 0)),
        percent: Math.max(0, toSafeNumber(data?.[sentimentKey]?.percent, 0)),
      })),
    [data, t],
  );

  const filteredItems = useMemo(
    () => sentimentItems.filter((item) => item.count > 0 || item.percent > 0),
    [sentimentItems],
  );

  const hasData = filteredItems.length > 0;

  const chartData = useMemo(
    () => ({
      labels: filteredItems.map((item) => item.label),
      datasets: [
        {
          data: filteredItems.map((item) => item.percent),
          backgroundColor: filteredItems.map(
            (item) => SENTIMENT_COLORS[item.key],
          ),
          borderWidth: 0,
          cutout: "68%",
        },
      ],
    }),
    [filteredItems],
  );

  const chartOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              const count = filteredItems[index]?.count ?? 0;
              const percent = filteredItems[index]?.percent ?? 0;
              return t("review.charts.shared.tooltipCountPercent", {
                count: countFormatter.format(count),
                percent: percentFormatter.format(percent),
              });
            },
          },
        },
      },
    }),
    [countFormatter, filteredItems, percentFormatter, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("review.charts.sentimentCount.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="space-y-3">
            <div className="h-[240px]">
              <Doughnut data={chartData} options={chartOptions} />
            </div>

            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: SENTIMENT_COLORS[item.key] }}
                    />
                    <span className="text-[#4b5563]">{item.label}</span>
                  </div>

                  <span className="text-[#6b7280]">
                    {countFormatter.format(item.count)} (
                    {percentFormatter.format(item.percent)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[240px] items-center justify-center">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
