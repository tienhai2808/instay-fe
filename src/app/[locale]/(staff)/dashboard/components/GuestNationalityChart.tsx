"use client";

import { useMemo, useRef } from "react";
import { Empty, Spin } from "antd";
import type { ChartOptions, Plugin } from "chart.js";
import { Bar } from "react-chartjs-2";
import countries from "i18n-iso-countries";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { DashboardGuestNationalChartItem } from "@/types/response/dashboard";
import { DASHBOARD_PURPLE_LIGHT } from "../utils/chart-setup";
import { toSafeNumber } from "../utils/dashboard-utils";
import { useIsBelowBreakpoint } from "../utils/use-is-below-breakpoint";

interface GuestNationalityChartProps {
  items: DashboardGuestNationalChartItem[];
  loading?: boolean;
}

const FLAG_ICON_BASE_URL =
  "https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3";
const FLAG_WIDTH = 20;
const FLAG_HEIGHT = 15;

const resolveAlpha2CountryCode = (value: string) => {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "";
  if (trimmed.length === 2) return trimmed.toLowerCase();
  if (trimmed.length === 3) {
    const alpha2 = countries.alpha3ToAlpha2(trimmed);
    return alpha2 ? alpha2.toLowerCase() : "";
  }
  return "";
};

export default function GuestNationalityChart({
  items,
  loading = false,
}: GuestNationalityChartProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";
  const isMobileViewport = useIsBelowBreakpoint(639);
  const flagImageCacheRef = useRef<Map<string, HTMLImageElement | null>>(
    new Map(),
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        maximumFractionDigits: 0,
      }),
    [language],
  );

  const normalizedItems = useMemo(
    () =>
      items
        .map((item) => ({
          national: item.national?.trim().toUpperCase() || "-",
          alpha2Code: resolveAlpha2CountryCode(item.national?.trim() || ""),
          guest_count: Math.max(0, toSafeNumber(item.guest_count, 0)),
        }))
        .sort((first, second) => second.guest_count - first.guest_count),
    [items],
  );

  const hasData = normalizedItems.some((item) => item.guest_count > 0);
  const labels = normalizedItems.map((item) => item.national);
  const alpha2Codes = normalizedItems.map((item) => item.alpha2Code);
  const values = normalizedItems.map((item) => item.guest_count);
  const minChartWidth = useMemo(
    () => Math.max(320, normalizedItems.length * (isMobileViewport ? 64 : 54)),
    [isMobileViewport, normalizedItems.length],
  );

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: DASHBOARD_PURPLE_LIGHT,
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: isMobileViewport ? 34 : 40,
          categoryPercentage: isMobileViewport ? 0.9 : 0.8,
        },
      ],
    }),
    [isMobileViewport, labels, values],
  );

  const options = useMemo<ChartOptions<"bar">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 24,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label || "-",
            label: (context) => {
              const value = toSafeNumber(context.parsed.y, 0);
              return t("operation.charts.guestNational.tooltipGuests", {
                count: numberFormatter.format(value),
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
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            font: {
              size: 10,
            },
            precision: 0,
          },
          grid: {
            color: "#e5e7eb",
          },
        },
      },
    }),
    [numberFormatter, t],
  );

  const xAxisFlagsPlugin = useMemo<Plugin<"bar">>(
    () => ({
      id: "dashboard-guest-national-flags",
      afterDraw: (chart) => {
        const ctx = chart.ctx;
        const xScale = chart.scales.x as
          | {
              getPixelForTick?: (index: number) => number;
              bottom?: number;
            }
          | undefined;

        if (
          !ctx ||
          !xScale?.getPixelForTick ||
          typeof xScale.bottom !== "number"
        )
          return;

        const requestChartRedraw = () => {
          if (!chart.ctx) return;
          if (!chart.canvas?.isConnected) return;
          chart.update("none");
        };

        const { chartArea } = chart;
        const drawY = xScale.bottom + 6;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = "500 10px Inter, sans-serif";
        ctx.fillStyle = "#6b7280";

        alpha2Codes.forEach((alpha2Code, index) => {
          const drawX = xScale.getPixelForTick?.(index);
          if (
            typeof drawX !== "number" ||
            drawX < chartArea.left ||
            drawX > chartArea.right
          ) {
            return;
          }

          if (!alpha2Code) {
            ctx.fillText(labels[index] || "-", drawX, drawY + FLAG_HEIGHT + 2);
            return;
          }

          const src = `${FLAG_ICON_BASE_URL}/${alpha2Code}.svg`;
          const cachedImage = flagImageCacheRef.current.get(src);

          if (
            cachedImage &&
            cachedImage.complete &&
            cachedImage.naturalWidth > 0
          ) {
            ctx.drawImage(
              cachedImage,
              drawX - FLAG_WIDTH / 2,
              drawY,
              FLAG_WIDTH,
              FLAG_HEIGHT,
            );
            return;
          }

          if (cachedImage === null) {
            ctx.fillText(labels[index] || "-", drawX, drawY + FLAG_HEIGHT + 2);
            return;
          }

          if (!cachedImage) {
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = () => {
              flagImageCacheRef.current.set(src, image);
              requestChartRedraw();
            };
            image.onerror = () => {
              // Do not cache hard-failure forever to avoid requiring hard refresh.
              flagImageCacheRef.current.delete(src);
              requestChartRedraw();
            };
            flagImageCacheRef.current.set(src, image);
            image.src = src;
          }
        });

        ctx.restore();
      },
    }),
    [alpha2Codes, labels],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <h2 className="mb-4 text-base font-bold text-[#111827]">
        {t("operation.charts.guestNational.title")}
      </h2>

      <Spin spinning={loading}>
        {hasData ? (
          <div className="-mx-1 overflow-x-auto">
            <div
              className="h-[280px] px-1 sm:h-[340px]"
              style={{ minWidth: `${minChartWidth}px` }}
            >
              <Bar data={data} options={options} plugins={[xAxisFlagsPlugin]} />
            </div>
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
