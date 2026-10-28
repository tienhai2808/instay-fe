import dayjs, { type Dayjs } from "dayjs";

export const DASHBOARD_MAIN_DATE_PRESET_VALUES = [
  "last_7_days",
  "last_30_days",
  "last_90_days",
  "this_week",
  "this_month",
  "this_year",
  "last_week",
  "last_month",
  "last_year",
  "custom",
] as const;

export type DashboardMainDatePreset =
  (typeof DASHBOARD_MAIN_DATE_PRESET_VALUES)[number];

export type DashboardTabKey = "overview" | "operation" | "review";
export type DashboardDateRange = [Dayjs, Dayjs];

export const DASHBOARD_CUSTOM_DATE_MIN_RANGE_DAYS = 5;
const MIN_DATE_RANGE_GAP_DAYS = DASHBOARD_CUSTOM_DATE_MIN_RANGE_DAYS - 1;

export const createTrailingDateRange = (
  days: number,
  today = dayjs().startOf("day"),
): DashboardDateRange => {
  const normalizedDays = Math.max(1, Math.floor(days));
  const toDate = today.startOf("day");
  const fromDate = toDate.subtract(normalizedDays - 1, "day");
  return [fromDate, toDate];
};

export const normalizeDateRange = (
  firstDate: Dayjs,
  secondDate: Dayjs,
): DashboardDateRange => {
  return firstDate.isAfter(secondDate, "day")
    ? [secondDate.startOf("day"), firstDate.startOf("day")]
    : [firstDate.startOf("day"), secondDate.startOf("day")];
};

export const isDateRangeGapValid = (firstDate: Dayjs, secondDate: Dayjs) => {
  const gapInDays = Math.abs(
    secondDate.startOf("day").diff(firstDate.startOf("day"), "day"),
  );
  return gapInDays >= MIN_DATE_RANGE_GAP_DAYS;
};

export const resolveDateRangeFromPreset = (
  preset: Exclude<DashboardMainDatePreset, "custom">,
  now = dayjs(),
): DashboardDateRange => {
  const today = now.startOf("day");

  if (preset === "last_7_days") {
    return createTrailingDateRange(7, today);
  }

  if (preset === "last_30_days") {
    return createTrailingDateRange(30, today);
  }

  if (preset === "last_90_days") {
    return createTrailingDateRange(90, today);
  }

  if (preset === "this_week") {
    return [today.startOf("week"), today.endOf("week").startOf("day")];
  }

  if (preset === "this_month") {
    return [today.startOf("month"), today.endOf("month").startOf("day")];
  }

  if (preset === "this_year") {
    return [today.startOf("year"), today.endOf("year").startOf("day")];
  }

  if (preset === "last_week") {
    const previousWeek = today.subtract(1, "week");
    return [
      previousWeek.startOf("week"),
      previousWeek.endOf("week").startOf("day"),
    ];
  }

  if (preset === "last_month") {
    const previousMonth = today.subtract(1, "month");
    return [
      previousMonth.startOf("month"),
      previousMonth.endOf("month").startOf("day"),
    ];
  }

  const previousYear = today.subtract(1, "year");
  return [
    previousYear.startOf("year"),
    previousYear.endOf("year").startOf("day"),
  ];
};

export const toSafeNumber = (value: unknown, fallback = 0) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toCompactNumber = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const absolute = Math.abs(safeValue);

  if (absolute >= 1_000_000_000) {
    return `${(safeValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${(safeValue / 1_000_000).toFixed(1)}M`;
  }
  if (absolute >= 1_000) {
    return `${(safeValue / 1_000).toFixed(1)}K`;
  }
  return `${Math.round(safeValue)}`;
};
