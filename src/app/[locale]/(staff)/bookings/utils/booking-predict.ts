import type { BookingPredict } from "@/types/data/booking";

export type BookingPredictRiskLevel = "low" | "medium" | "high" | "unknown";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const normalizeBookingPredictRiskLevel = (
  riskLevel?: string | null,
): BookingPredictRiskLevel => {
  const normalized = String(riskLevel || "")
    .trim()
    .toLowerCase();

  if (normalized === "low") return "low";
  if (normalized === "medium") return "medium";
  if (normalized === "high") return "high";

  return "unknown";
};

export const getBookingPredictProbabilityPercent = (
  probability?: number | null,
) => {
  if (typeof probability !== "number" || Number.isNaN(probability)) {
    return null;
  }

  const percent = clamp(probability, 0, 1) * 100;
  return Math.round(percent * 100) / 100;
};

export const hasBookingPredictData = (predict?: BookingPredict | null) => {
  if (!predict) return false;

  return (
    typeof predict.cancellation_probability === "number" ||
    typeof predict.will_cancel === "boolean" ||
    typeof predict.risk_level === "string"
  );
};
