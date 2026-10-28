"use client";

import { useMemo } from "react";
import { Empty, Spin } from "antd";
import type { ChartOptions, Plugin } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardSupportTicketTimeChartItem } from "@/types/response/dashboard";
import { toSafeNumber } from "../utils/dashboard-utils";
import "../utils/chart-setup";

interface SupportTicketResolutionDonutChartProps {
  averageResolutionMinutes?: number;
  items: DashboardSupportTicketTimeChartItem[];
  loading?: boolean;
}

const DONUT_COLORS = ["#8b5cf6", "#60a5fa", "#14b8a6", "#f59e0b", "#ef4444"];

export default function SupportTicketResolutionDonutChart({
  averageResolutionMinutes,
  items,
  loading = false,
}: SupportTicketResolutionDonutChartProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [language],
  );

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

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          toSafeNumber(item.ticket_count, 0) > 0 ||
          toSafeNumber(item.ticket_percent, 0) > 0,
      ),
    [items],
  );

  const labels = filteredItems.map((item) => item.tag?.trim() || "-");
  const percentValues = filteredItems.map((item) =>
    Math.max(0, toSafeNumber(item.ticket_percent, 0)),
  );
  const hasData = filteredItems.length > 0;

  const safeAverageResolutionMinutes = Math.max(
    0,
    toSafeNumber(averageResolutionMinutes, 0),
  );
  const averageText = `${numberFormatter.format(safeAverageResolutionMinutes)}m`;
  const centerLabel = t("operation.charts.supportTicketTime.averageLabel");

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: percentValues,
          backgroundColor: filteredItems.map(
            (_, index) => DONUT_COLORS[index % DONUT_COLORS.length],
          ),
          borderWidth: 0,
          cutout: "72%",
        },
      ],
    }),
    [filteredItems, labels, percentValues],
  );

  const centerTextPlugin = useMemo<Plugin<"doughnut">>(
    () => ({
      id: "dashboard-support-ticket-donut-center-text",
      afterDraw: (chart) => {
        const { ctx } = chart;
        const firstArc = chart.getDatasetMeta(0)?.data?.[0];
        if (!firstArc) return;

        const centerX = firstArc.x;
        const centerY = firstArc.y;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillStyle = "#111827";
        ctx.font = "700 16px Inter, sans-serif";
        ctx.fillText(averageText, centerX, centerY - 8);

        ctx.fillStyle = "#6b7280";
        ctx.font = "500 11px Inter, sans-serif";
        ctx.fillText(centerLabel, centerX, centerY + 10);
        ctx.restore();
      },
    }),
    [averageText, centerLabel],
  );

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    }),
    [],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("operation.charts.supportTicketTime.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="space-y-3">
            <div className="h-[200px]">
              <Doughnut
                data={data}
                options={options}
                plugins={[centerTextPlugin]}
              />
            </div>

            <div className="space-y-2">
              {filteredItems.map((item, index) => (
                <div
                  key={`${item.tag || "tag"}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                    <span className="text-[#4b5563]">
                      {item.tag?.trim() || "-"}
                    </span>
                  </div>
                  <span className="text-[#6b7280]">
                    {countFormatter.format(
                      Math.max(0, toSafeNumber(item.ticket_count, 0)),
                    )}{" "}
                    (
                    {percentFormatter.format(
                      toSafeNumber(item.ticket_percent, 0),
                    )}
                    %)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center">
            <Empty description={t("empty.noChartData")} />
          </div>
        )}
      </Spin>
    </section>
  );
}
