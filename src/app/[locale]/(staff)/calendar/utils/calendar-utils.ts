import { LOCALE_VI } from "@/constants/locale";
import type { PricingCalendar } from "@/types/data/pricing_calendar";
import type { PricingTag } from "@/types/data/pricing_tag";
import type { UpdatePricingCalendarsRequest } from "@/types/request/pricing_calendar";

export type CalendarWeekStart = 0 | 1;

export type PricingCalendarDraft = Record<string, number | null>;

export interface CalendarMonthCell {
  dateKey: string;
  day: number;
  isInMonth: boolean;
}

export interface CalendarMonthWeekRow {
  key: string;
  dateKeysInMonth: string[];
  cells: CalendarMonthCell[];
}

export interface CalendarMonthGridData {
  rows: CalendarMonthWeekRow[];
  dateKeysByWeekday: Record<number, string[]>;
}

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const TAG_COLORS = [
  "#8b5cf6",
  "#60a5fa",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#ec4899",
  "#6366f1",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#0ea5e9",
  "#e11d48",
  "#a855f7",
  "#0284c7",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#d946ef",
  "#4f46e5",
  "#7c3aed",
  "#2563eb",
  "#0d9488",
  "#ea580c",
  "#65a30d",
  "#c026d3",
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#9333ea",
  "#0891b2",
  "#facc15",
] as const;

const pad2 = (value: number) => String(value).padStart(2, "0");

const clampColorPart = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, Math.round(value)));
};

const normalizePositiveInteger = (value: unknown): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const toDateKey = (year: number, month: number, day: number) => {
  return `${year}-${pad2(month)}-${pad2(day)}`;
};

export const parseDateKeyToUtcDate = (dateKey: string): Date | null => {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const formatUtcDateToDateKey = (date: Date) => {
  return toDateKey(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
};

export const toUtcDateKey = (value?: string | null): string | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  const directMatch = DATE_KEY_PATTERN.exec(value.trim());
  if (directMatch) {
    const parsed = parseDateKeyToUtcDate(value.trim());
    if (!parsed) return null;
    return formatUtcDateToDateKey(parsed);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return toDateKey(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
};

export const toUtcMidnightIso = (dateKey: string): string => {
  return `${dateKey}T00:00:00Z`;
};

export const normalizePricingCalendarDraft = (
  items?: PricingCalendar[] | null,
): PricingCalendarDraft => {
  const nextDraft: PricingCalendarDraft = {};

  (items || []).forEach((item) => {
    const dateKey = toUtcDateKey(item.date);
    if (!dateKey) return;

    const nextTagId = normalizePositiveInteger(item.pricing_tag_id);
    nextDraft[dateKey] = nextTagId;
  });

  return nextDraft;
};

export const buildPricingCalendarsUpdatePayload = (
  draftByDate: PricingCalendarDraft,
): UpdatePricingCalendarsRequest => {
  const grouped = new Map<number, string[]>();

  Object.entries(draftByDate).forEach(([dateKey, pricingTagId]) => {
    const parsedDate = parseDateKeyToUtcDate(dateKey);
    if (!parsedDate) return;

    if (typeof pricingTagId !== "number" || !Number.isFinite(pricingTagId)) {
      return;
    }

    const normalizedTagId = Math.floor(pricingTagId);
    if (normalizedTagId <= 0) return;

    const currentDates = grouped.get(normalizedTagId) || [];
    currentDates.push(toUtcMidnightIso(dateKey));
    grouped.set(normalizedTagId, currentDates);
  });

  const pricing_calendars = Array.from(grouped.entries())
    .map(([pricingTagId, dates]) => ({
      pricing_tag_id: String(pricingTagId),
      dates: dates.sort(),
    }))
    .sort(
      (first, second) =>
        Number(first.pricing_tag_id) - Number(second.pricing_tag_id),
    );

  return {
    pricing_calendars,
  };
};

export const areDraftMapsEqual = (
  first: PricingCalendarDraft,
  second: PricingCalendarDraft,
) => {
  const firstKeys = Object.keys(first).sort();
  const secondKeys = Object.keys(second).sort();

  if (firstKeys.length !== secondKeys.length) return false;

  for (let index = 0; index < firstKeys.length; index += 1) {
    if (firstKeys[index] !== secondKeys[index]) return false;

    const dateKey = firstKeys[index];
    if ((first[dateKey] ?? null) !== (second[dateKey] ?? null)) return false;
  }

  return true;
};

export const clearTagAssignments = (
  draftByDate: PricingCalendarDraft,
  pricingTagId: number,
): PricingCalendarDraft => {
  const nextDraft: PricingCalendarDraft = { ...draftByDate };

  Object.entries(nextDraft).forEach(([dateKey, currentTagId]) => {
    if (currentTagId === pricingTagId) {
      nextDraft[dateKey] = null;
    }
  });

  return nextDraft;
};

export const applyTagToDateKeys = (
  draftByDate: PricingCalendarDraft,
  dateKeys: string[],
  nextTagId: number | null,
): PricingCalendarDraft => {
  const nextDraft: PricingCalendarDraft = { ...draftByDate };

  dateKeys.forEach((dateKey) => {
    if (!(dateKey in nextDraft)) return;
    nextDraft[dateKey] = nextTagId;
  });

  return nextDraft;
};

export const getWeekStartByLocale = (locale: string): CalendarWeekStart => {
  return locale === LOCALE_VI ? 1 : 0;
};

export const getWeekdayLabels = (
  locale: string,
  weekStart: CalendarWeekStart,
) => {
  const formatter = new Intl.DateTimeFormat(
    locale === LOCALE_VI ? "vi-VN" : "en-US",
    {
      weekday: "short",
      timeZone: "UTC",
    },
  );

  const sundayAnchor = new Date(Date.UTC(2026, 0, 4));

  return Array.from({ length: 7 }).map((_, index) => {
    const offset = (weekStart + index) % 7;
    const date = new Date(sundayAnchor.getTime() + offset * DAY_IN_MS);
    return formatter.format(date);
  });
};

export const buildMonthGrid = (
  year: number,
  monthIndex: number,
  weekStart: CalendarWeekStart,
): CalendarMonthGridData => {
  const firstDate = new Date(Date.UTC(year, monthIndex, 1));
  const firstWeekday = firstDate.getUTCDay();
  const offset = (firstWeekday - weekStart + 7) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const firstCellDate = new Date(Date.UTC(year, monthIndex, 1 - offset));

  const rows: CalendarMonthWeekRow[] = [];
  const dateKeysByWeekday: Record<number, string[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  for (let rowIndex = 0; rowIndex < totalCells / 7; rowIndex += 1) {
    const cells: CalendarMonthCell[] = [];
    const dateKeysInMonth: string[] = [];

    for (let cellIndex = 0; cellIndex < 7; cellIndex += 1) {
      const currentIndex = rowIndex * 7 + cellIndex;
      const currentDate = new Date(
        firstCellDate.getTime() + currentIndex * DAY_IN_MS,
      );
      const dateKey = formatUtcDateToDateKey(currentDate);
      const isInMonth = currentDate.getUTCMonth() === monthIndex;

      cells.push({
        dateKey,
        day: currentDate.getUTCDate(),
        isInMonth,
      });

      if (isInMonth) {
        dateKeysInMonth.push(dateKey);
        dateKeysByWeekday[cellIndex].push(dateKey);
      }
    }

    rows.push({
      key: `${year}-${monthIndex + 1}-${rowIndex}`,
      dateKeysInMonth,
      cells,
    });
  }

  return {
    rows,
    dateKeysByWeekday,
  };
};

export const getCalendarYearsFromDraft = (
  draftByDate: PricingCalendarDraft,
  fallbackYear: number,
): number[] => {
  const extractedYears = Array.from(
    new Set(
      Object.keys(draftByDate)
        .map((dateKey) => Number(dateKey.slice(0, 4)))
        .filter((year) => Number.isFinite(year) && year > 1970),
    ),
  ).sort((first, second) => first - second);

  if (extractedYears.length >= 2) {
    return extractedYears.slice(0, 2);
  }

  if (extractedYears.length === 1) {
    return [extractedYears[0], extractedYears[0] + 1];
  }

  return [fallbackYear, fallbackYear + 1];
};

const hashString = (value: string) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = Math.min(100, Math.max(0, saturation)) / 100;
  const normalizedLightness = Math.min(100, Math.max(0, lightness)) / 100;

  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const hueSection = normalizedHue / 60;
  const secondComponent = chroma * (1 - Math.abs((hueSection % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSection >= 0 && hueSection < 1) {
    red = chroma;
    green = secondComponent;
  } else if (hueSection >= 1 && hueSection < 2) {
    red = secondComponent;
    green = chroma;
  } else if (hueSection >= 2 && hueSection < 3) {
    green = chroma;
    blue = secondComponent;
  } else if (hueSection >= 3 && hueSection < 4) {
    green = secondComponent;
    blue = chroma;
  } else if (hueSection >= 4 && hueSection < 5) {
    red = secondComponent;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondComponent;
  }

  const match = normalizedLightness - chroma / 2;

  const rgb = [
    clampColorPart((red + match) * 255),
    clampColorPart((green + match) * 255),
    clampColorPart((blue + match) * 255),
  ];

  return `#${rgb.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
};

const buildGeneratedColor = (seed: number) => {
  const hue = seed % 360;
  const saturation = 62 + (seed % 12);
  const lightness = 44 + (seed % 8);
  return hslToHex(hue, saturation, lightness);
};

export const resolveStableTagColorMap = (tags: PricingTag[]) => {
  const sortedTags = [...tags]
    .filter(
      (tag): tag is PricingTag =>
        Boolean(tag) && typeof tag.id === "number" && Number.isFinite(tag.id),
    )
    .sort((first, second) => first.id - second.id);

  const usedColors = new Set<string>();
  const usedPaletteIndex = new Set<number>();
  const colorMap: Record<number, string> = {};

  sortedTags.forEach((tag) => {
    const hash = hashString(`${tag.id}:${tag.name || ""}`);
    const startIndex = hash % TAG_COLORS.length;

    let paletteIndex = -1;
    for (let offset = 0; offset < TAG_COLORS.length; offset += 1) {
      const nextIndex = (startIndex + offset) % TAG_COLORS.length;
      if (usedPaletteIndex.has(nextIndex)) continue;
      paletteIndex = nextIndex;
      break;
    }

    let nextColor = "";
    if (paletteIndex >= 0) {
      usedPaletteIndex.add(paletteIndex);
      nextColor = TAG_COLORS[paletteIndex];
    } else {
      let generatedOffset = 0;
      do {
        nextColor = buildGeneratedColor(hash + generatedOffset * 37);
        generatedOffset += 1;
      } while (usedColors.has(nextColor));
    }

    usedColors.add(nextColor);
    colorMap[tag.id] = nextColor;
  });

  return colorMap;
};

export const toRgbaColor = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "").trim();
  const safeAlpha = Math.max(0, Math.min(1, alpha));

  if (normalized.length !== 6 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    return `rgba(139, 92, 246, ${safeAlpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
};

export const isPayloadEmpty = (payload: UpdatePricingCalendarsRequest) => {
  return payload.pricing_calendars.length === 0;
};
