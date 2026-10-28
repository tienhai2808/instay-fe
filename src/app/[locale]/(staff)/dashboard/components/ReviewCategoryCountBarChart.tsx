"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { Empty, Spin } from "antd";
import type { ChartOptions } from "chart.js";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardReviewCategoryCountChartItem } from "@/types/response/dashboard";
import { DASHBOARD_PURPLE_LIGHT } from "../utils/chart-setup";
import { toSafeNumber } from "../utils/dashboard-utils";

interface ReviewCategoryCountBarChartProps {
  items: DashboardReviewCategoryCountChartItem[];
  loading?: boolean;
}

const normalizeCategoryKey = (value: unknown) => {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text.trim().toLowerCase();
};

export default function ReviewCategoryCountBarChart({
  items,
  loading = false,
}: ReviewCategoryCountBarChartProps) {
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

  const normalizedItems = useMemo(
    () =>
      items.map((item) => {
        const rawCategory = item.category?.trim() || "-";
        const normalizedCategory = normalizeCategoryKey(rawCategory);
        const translationKey = `review.categories.${normalizedCategory}`;

        return {
          rawCategory,
          categoryLabel: t.has(translationKey)
            ? t(translationKey)
            : rawCategory,
          reviewCount: Math.max(0, toSafeNumber(item.review_count, 0)),
        };
      }),
    [items, t],
  );

  const hasData = normalizedItems.some((item) => item.reviewCount > 0);

  const chartData = useMemo(
    () => ({
      labels: normalizedItems.map((item) => item.categoryLabel),
      datasets: [
        {
          data: normalizedItems.map((item) => item.reviewCount),
          backgroundColor: DASHBOARD_PURPLE_LIGHT,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42,
        },
      ],
    }),
    [normalizedItems],
  );

  const chartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label || "-",
            label: (context) => {
              const value = Math.max(0, toSafeNumber(context.parsed.y, 0));
              return t("review.charts.categoryCount.tooltipReviews", {
                count: countFormatter.format(value),
              });
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "#f3f4f6",
          },
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
            },
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
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
    [countFormatter, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("review.charts.categoryCount.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="h-[300px] sm:h-[340px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center sm:h-[340px]">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
