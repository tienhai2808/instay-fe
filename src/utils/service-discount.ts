import type { ServiceDiscountType } from "@/types/data/service";

export interface ServiceDiscountSource {
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: string;
  discount_end_at?: string;
}

export interface ServiceDiscountMeta {
  type: ServiceDiscountType;
  value: number;
  startAtMs: number;
  endAtMs: number;
}

const isValidDiscountType = (
  value?: ServiceDiscountType,
): value is ServiceDiscountType => {
  return value === "percent" || value === "amount";
};

const toFiniteNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
};

const toTimestamp = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
};

export const getServiceDiscountMeta = (
  source?: ServiceDiscountSource | null,
): ServiceDiscountMeta | null => {
  if (!source) return null;
  if (!isValidDiscountType(source.discount_type)) return null;

  const value = toFiniteNumber(source.discount_value);
  const startAtMs = toTimestamp(source.discount_start_at);
  const endAtMs = toTimestamp(source.discount_end_at);

  if (value == null || value <= 0) return null;
  if (startAtMs == null || endAtMs == null) return null;
  if (endAtMs < startAtMs) return null;

  return {
    type: source.discount_type,
    value,
    startAtMs,
    endAtMs,
  };
};

export const hasCompleteServiceDiscount = (
  source?: ServiceDiscountSource | null,
) => {
  return Boolean(getServiceDiscountMeta(source));
};

export const isServiceDiscountActive = (
  source?: ServiceDiscountSource | null,
  atMs: number = Date.now(),
) => {
  const meta = getServiceDiscountMeta(source);
  if (!meta) return false;
  return atMs >= meta.startAtMs && atMs <= meta.endAtMs;
};

export const getServiceDiscountedPrice = (
  price: number | undefined,
  source?: ServiceDiscountSource | null,
  atMs: number = Date.now(),
) => {
  if (typeof price !== "number" || Number.isNaN(price)) return undefined;

  const meta = getServiceDiscountMeta(source);
  if (!meta) return price;
  if (atMs < meta.startAtMs || atMs > meta.endAtMs) return price;

  const discountAmount =
    meta.type === "percent" ? (price * meta.value) / 100 : meta.value;
  const nextPrice = price - discountAmount;
  return nextPrice > 0 ? nextPrice : 0;
};
