"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import type { ArcElement, ChartOptions, Plugin } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardSourceRevenueChartItem } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";
import "../utils/chart-setup";

interface SourceRevenueChartProps {
  items: DashboardSourceRevenueChartItem[];
  loading?: boolean;
}

const sourcePieLabelPlugin: Plugin<"pie"> = {
  id: "dashboard-source-pie-labels",
  afterDatasetsDraw: (chart) => {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const labels = chart.data.labels || [];
    const data = chart.data.datasets[0]?.data || [];
    const colors = chart.data.datasets[0]?.backgroundColor || [];

    ctx.save();
    ctx.font = "600 11px Inter, sans-serif";
    ctx.textBaseline = "middle";

    meta.data.forEach((element, index) => {
      const arc = element as ArcElement;
      const rawValue = Number(data[index] || 0);
      if (!Number.isFinite(rawValue) || rawValue <= 0) return;

      const color = Array.isArray(colors)
        ? (colors[index] as string) || "#8b5cf6"
        : "#8b5cf6";

      const midAngle = (arc.startAngle + arc.endAngle) / 2;
      const cosine = Math.cos(midAngle);
      const sine = Math.sin(midAngle);
      const startX = arc.x + cosine * arc.outerRadius;
      const startY = arc.y + sine * arc.outerRadius;
      const middleX = arc.x + cosine * (arc.outerRadius + 18);
      const middleY = arc.y + sine * (arc.outerRadius + 18);
      const endX = middleX + (cosine >= 0 ? 34 : -34);
      const endY = middleY;
      const isRight = cosine >= 0;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.moveTo(startX, startY);
      ctx.lineTo(middleX, middleY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.fillStyle = "#4b5563";
      ctx.textAlign = isRight ? "left" : "right";
      const label = String(labels[index] ?? "");
      const percentText = `${rawValue.toFixed(2)}%`;
      const textX = endX + (isRight ? 4 : -4);
      ctx.fillText(label, textX, endY - 8);
      ctx.fillStyle = color;
      ctx.fillText(percentText, textX, endY + 8);
    });

    ctx.restore();
  },
};

const PIE_COLORS = [
  "#8b5cf6",
  "#60a5fa",
  "#f97316",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#6366f1",
];

export default function SourceRevenueChart({
  items,
  loading = false,
}: SourceRevenueChartProps) {
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

  const labels = filteredItems.map((item) => item.source_name?.trim() || "-");
  const revenueValues = filteredItems.map((item) =>
    Math.max(0, toSafeNumber(item.revenue, 0)),
  );
  const percentValues = filteredItems.map((item) =>
    Math.max(0, toSafeNumber(item.revenue_percent, 0)),
  );

  const hasData = filteredItems.length > 0;

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: percentValues,
          backgroundColor: filteredItems.map(
            (_, index) => PIE_COLORS[index % PIE_COLORS.length],
          ),
          borderWidth: 0,
        },
      ],
    }),
    [filteredItems, labels, percentValues],
  );

  const options = useMemo<ChartOptions<"pie">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30,
          right: 54,
          bottom: 30,
          left: 54,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const index = context.dataIndex;
              const revenue = revenueValues[index] ?? 0;
              const percent = percentValues[index] ?? 0;
              return `${amountFormatter.format(revenue)} VND (${percent.toFixed(2)}%)`;
            },
          },
        },
      },
    }),
    [amountFormatter, percentValues, revenueValues],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("charts.sourceRevenue.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="h-[320px] sm:h-[240px]">
            <Pie
              data={data}
              options={options}
              plugins={[sourcePieLabelPlugin]}
            />
          </div>
        ) : (
          <div className="flex h-[320px] items-center justify-center sm:h-[240px]">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
