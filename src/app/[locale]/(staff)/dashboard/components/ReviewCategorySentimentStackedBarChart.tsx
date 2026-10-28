"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Empty, Spin } from "antd";
import type { ChartOptions } from "chart.js";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardReviewCategorySentimentChartItem } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";
import "../utils/chart-setup";

interface ReviewCategorySentimentStackedBarChartProps {
  items: DashboardReviewCategorySentimentChartItem[];
  loading?: boolean;
}

type SentimentKey = "positive" | "neutral" | "negative";

const SENTIMENT_ORDER: SentimentKey[] = ["positive", "neutral", "negative"];

const SENTIMENT_COLORS: Record<SentimentKey, string> = {
  positive: "#16a34a",
  neutral: "#8b5cf6",
  negative: "#dc2626",
};

const normalizeCategoryKey = (value: unknown) => {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text.trim().toLowerCase();
};

export default function ReviewCategorySentimentStackedBarChart({
  items,
  loading = false,
}: ReviewCategorySentimentStackedBarChartProps) {
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

  const normalizedItems = useMemo(
    () =>
      items.map((item) => {
        const rawCategory = item.category?.trim() || "-";
        const normalizedCategory = normalizeCategoryKey(rawCategory);
        const translationKey = `review.categories.${normalizedCategory}`;

        return {
          categoryLabel: t.has(translationKey)
            ? t(translationKey)
            : rawCategory,
          positive: {
            count: Math.max(0, toSafeNumber(item.positive?.count, 0)),
            percent: Math.max(0, toSafeNumber(item.positive?.percent, 0)),
          },
          neutral: {
            count: Math.max(0, toSafeNumber(item.neutral?.count, 0)),
            percent: Math.max(0, toSafeNumber(item.neutral?.percent, 0)),
          },
          negative: {
            count: Math.max(0, toSafeNumber(item.negative?.count, 0)),
            percent: Math.max(0, toSafeNumber(item.negative?.percent, 0)),
          },
        };
      }),
    [items, t],
  );

  const hasData = normalizedItems.some(
    (item) =>
      item.positive.count > 0 ||
      item.neutral.count > 0 ||
      item.negative.count > 0,
  );

  const chartData = useMemo(
    () => ({
      labels: normalizedItems.map((item) => item.categoryLabel),
      datasets: SENTIMENT_ORDER.map((sentimentKey) => ({
        label: t(`review.sentiments.${sentimentKey}`),
        data: normalizedItems.map((item) => item[sentimentKey].count),
        backgroundColor: SENTIMENT_COLORS[sentimentKey],
        borderRadius: 4,
        borderSkipped: false,
        maxBarThickness: 20,
      })),
    }),
    [normalizedItems, t],
  );

  const chartHeight = Math.max(300, normalizedItems.length * 52);

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
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
            title: (tooltipItems) => tooltipItems?.[0]?.label || "-",
            label: (context) => {
              const sentimentKey =
                SENTIMENT_ORDER[context.datasetIndex] ?? "neutral";
              const category = normalizedItems[context.dataIndex];
              const count = Math.max(0, toSafeNumber(context.parsed.x, 0));
              const percent = Math.max(
                0,
                toSafeNumber(category?.[sentimentKey]?.percent, 0),
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
          stacked: true,
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
        y: {
          stacked: true,
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
            },
          },
          grid: {
            color: "#f3f4f6",
          },
        },
      },
    }),
    [countFormatter, normalizedItems, percentFormatter, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("review.charts.categorySentiment.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div style={{ height: `${chartHeight}px` }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
