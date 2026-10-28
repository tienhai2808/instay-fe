"use client";

import { Modal } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { RiRobot2Line } from "react-icons/ri";
import type { BookingPredict } from "@/types/data/booking";
import {
  getBookingPredictProbabilityPercent,
  hasBookingPredictData,
  normalizeBookingPredictRiskLevel,
} from "../utils/booking-predict";

interface BookingPredictModalProps {
  open: boolean;
  onClose: () => void;
  predict?: BookingPredict | null;
  bookingNumber?: string;
}

const getRiskThemeClassNames = (riskLevel: string) => {
  if (riskLevel === "high") {
    return {
      hero: "border-red-200 bg-red-50",
      icon: "bg-red-100 text-red-600",
      badge: "border-red-200 bg-red-100 text-red-700",
      progress: "bg-red-500",
      suggestion: "text-red-700",
    };
  }

  if (riskLevel === "medium") {
    return {
      hero: "border-amber-200 bg-amber-50",
      icon: "bg-amber-100 text-amber-700",
      badge: "border-amber-200 bg-amber-100 text-amber-700",
      progress: "bg-amber-500",
      suggestion: "text-amber-700",
    };
  }

  if (riskLevel === "low") {
    return {
      hero: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-100 text-emerald-700",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
      progress: "bg-emerald-500",
      suggestion: "text-emerald-700",
    };
  }

  return {
    hero: "border-gray-200 bg-gray-50",
    icon: "bg-gray-200 text-gray-700",
    badge: "border-gray-200 bg-gray-100 text-gray-700",
    progress: "bg-gray-500",
    suggestion: "text-gray-700",
  };
};

const getRiskSuggestionKey = (riskLevel: string) => {
  if (riskLevel === "high") return "predict.modal.suggestions.high";
  if (riskLevel === "medium") return "predict.modal.suggestions.medium";
  if (riskLevel === "low") return "predict.modal.suggestions.low";
  return "predict.modal.suggestions.unknown";
};

export default function BookingPredictModal({
  open,
  onClose,
  predict,
  bookingNumber,
}: BookingPredictModalProps) {
  const t = useTranslations("BookingsPage");
  const locale = useLocale();

  const hasData = hasBookingPredictData(predict);
  const probabilityPercent = getBookingPredictProbabilityPercent(
    predict?.cancellation_probability,
  );
  const normalizedRiskLevel = normalizeBookingPredictRiskLevel(
    predict?.risk_level,
  );
  const theme = getRiskThemeClassNames(normalizedRiskLevel);

  const probabilityText =
    probabilityPercent == null
      ? t("predict.values.noData")
      : `${probabilityPercent.toLocaleString(
          locale === "vi" ? "vi-VN" : "en-US",
          {
            minimumFractionDigits: probabilityPercent % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2,
          },
        )}%`;

  const willCancelText =
    typeof predict?.will_cancel === "boolean"
      ? predict.will_cancel
        ? t("predict.values.yes")
        : t("predict.values.no")
      : t("predict.values.noData");

  const progressWidth =
    probabilityPercent == null
      ? 0
      : Math.max(4, Math.min(100, Math.round(probabilityPercent)));

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      destroyOnHidden
      centered
      title={
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
            <RiRobot2Line className="text-lg" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#171717]">
              {t("predict.modal.title")}
            </p>
            <p className="truncate text-xs text-[#6b7280]">
              {t("predict.modal.booking", {
                bookingNumber: bookingNumber?.trim() || "-",
              })}
            </p>
          </div>
        </div>
      }
    >
      <div className="mt-3 flex flex-col gap-4">
        <div className={`rounded-xl border p-4 ${theme.hero}`}>
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${theme.icon}`}
            >
              <RiRobot2Line className="text-xl" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#171717]">
                {t("predict.modal.subtitle")}
              </p>
              <p className="mt-1 text-sm text-[#4b5563]">
                {t(getRiskSuggestionKey(normalizedRiskLevel))}
              </p>
            </div>
          </div>
        </div>

        {!hasData ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
            {t("predict.values.noData")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("predict.modal.fields.probability")}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#171717]">
                  {probabilityText}
                </p>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("predict.modal.fields.riskLevel")}
                </p>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold ${theme.badge}`}
                >
                  {t(`predict.riskLevels.${normalizedRiskLevel}`)}
                </span>
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("predict.modal.fields.willCancel")}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#171717]">
                  {willCancelText}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-gray-500">
                <span>{t("predict.modal.scaleLabel")}</span>
                <span>{probabilityText}</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className={`h-full rounded-full ${theme.progress}`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>

              <p className={`mt-2 text-sm font-medium ${theme.suggestion}`}>
                {t("predict.modal.footnote")}
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
