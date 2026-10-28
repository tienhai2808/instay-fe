"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import type { ChartOptions, Plugin } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardRoomTypeRevenueChartItem } from "@/types/response/dashboard";
import { DASHBOARD_PURPLE_LIGHT } from "../utils/chart-setup";
import { toCompactNumber, toSafeNumber } from "../utils/dashboard-utils";

interface RoomTypeRevenueChartProps {
  items: DashboardRoomTypeRevenueChartItem[];
  loading?: boolean;
}

const MAX_Y_LABEL_CHARS = 18;

const truncateLabel = (value: unknown, maxChars = MAX_Y_LABEL_CHARS) => {
  const text = typeof value === "string" ? value : String(value ?? "");
  const trimmed = text.trim();
  if (!trimmed) return "-";
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxChars - 1))}\u2026`;
};

const valueLabelPlugin: Plugin<"bar"> = {
  id: "dashboard-room-type-value-label",
  afterDatasetsDraw: (chart) => {
    const { ctx } = chart;
    const chartArea = chart.chartArea;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    if (!dataset || !meta || !chartArea) return;

    ctx.save();
    ctx.font = "600 11px Inter, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";

    meta.data.forEach((bar, index) => {
      const rawValue = toSafeNumber(dataset.data[index], 0);
      const label = toCompactNumber(rawValue);
      const textWidth = ctx.measureText(label).width;
      const x = Math.min(bar.x + 8, chartArea.right - textWidth - 4);
      const y = Math.min(
        Math.max(bar.y, chartArea.top + 10),
        chartArea.bottom - 10,
      );
      ctx.fillText(label, x, y);
    });

    ctx.restore();
  },
};

export default function RoomTypeRevenueChart({
  items,
  loading = false,
}: RoomTypeRevenueChartProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const filteredItems = useMemo(
    () => items.filter((item) => toSafeNumber(item.revenue, 0) > 0),
    [items],
  );

  const hasData = filteredItems.length > 0;
  const labels = filteredItems.map(
    (item) => item.room_type_name?.trim() || "-",
  );
  const values = filteredItems.map((item) =>
    Math.max(0, toSafeNumber(item.revenue, 0)),
  );
  const chartHeight = Math.max(260, filteredItems.length * 42);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: DASHBOARD_PURPLE_LIGHT,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 20,
        },
      ],
    }),
    [labels, values],
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          right: 44,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => {
              const first = tooltipItems?.[0];
              const label = String(first?.label ?? "").trim();
              return label || "-";
            },
            label: (context) => {
              const value = toSafeNumber(context.parsed.x, 0);
              return `${amountFormatter.format(value)} VND`;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          grace: "20%",
        },
        y: {
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
            },
            callback: function (value) {
              // Category scale passes index; resolve to label for display.
              const resolved =
                typeof (this as { getLabelForValue?: (v: number) => string })
                  .getLabelForValue === "function"
                  ? (
                      this as { getLabelForValue: (v: number) => string }
                    ).getLabelForValue(Number(value))
                  : String(value);

              return truncateLabel(resolved);
            },
          },
          grid: {
            color: "#f3f4f6",
          },
          border: {
            display: true,
            color: "#afafb6",
            width: 2,
          },
        },
      },
    }),
    [amountFormatter],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("charts.roomTypeRevenue.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div style={{ height: `${chartHeight}px` }}>
            <Bar data={data} options={options} plugins={[valueLabelPlugin]} />
          </div>
        ) : (
          <div className="flex h-[260px] items-center justify-center">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
