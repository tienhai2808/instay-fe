import { Fragment, memo, useMemo } from "react";
import type { PointerEvent } from "react";
import { Tooltip } from "antd";
import { BiBrush } from "react-icons/bi";
import DayCell from "./DayCell";
import type {
  CalendarWeekStart,
  PricingCalendarDraft,
} from "../utils/calendar-utils";
import { buildMonthGrid, getWeekdayLabels } from "../utils/calendar-utils";

interface MonthCalendarGridLabels {
  today: string;
  noTag: string;
  outsideMonth: string;
  paintRow: string;
  paintColumn: string;
  monthEmpty: string;
}

interface MonthCalendarGridProps {
  year: number;
  monthIndex: number;
  locale: string;
  weekStart: CalendarWeekStart;
  draftByDate: PricingCalendarDraft;
  availableDateKeys: Set<string>;
  tagNameById: Record<number, string>;
  tagColorById: Record<number, string>;
  activeTagId: number | null;
  todayDateKey?: string;
  disabledInteractions?: boolean;
  labels: MonthCalendarGridLabels;
  onDatePointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    dateKey: string,
  ) => void;
  onDatePointerEnter: (dateKey: string) => void;
  onPaintDates: (dateKeys: string[]) => void;
}

function MonthCalendarGrid({
  year,
  monthIndex,
  locale,
  weekStart,
  draftByDate,
  availableDateKeys,
  tagNameById,
  tagColorById,
  activeTagId,
  todayDateKey,
  disabledInteractions = false,
  labels,
  onDatePointerDown,
  onDatePointerEnter,
  onPaintDates,
}: MonthCalendarGridProps) {
  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    return formatter.format(new Date(Date.UTC(year, monthIndex, 1)));
  }, [locale, monthIndex, year]);

  const weekdayLabels = useMemo(
    () => getWeekdayLabels(locale, weekStart),
    [locale, weekStart],
  );

  const monthGrid = useMemo(
    () => buildMonthGrid(year, monthIndex, weekStart),
    [monthIndex, weekStart, year],
  );

  const hasAvailableDays = useMemo(
    () =>
      monthGrid.rows.some((row) =>
        row.dateKeysInMonth.some((dateKey) => availableDateKeys.has(dateKey)),
      ),
    [availableDateKeys, monthGrid.rows],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <h3 className="mb-3 text-sm font-semibold capitalize text-[#111827]">
        {monthLabel}
      </h3>

      <div className="grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1.5">
        <div />

        {weekdayLabels.map((weekdayLabel, weekdayIndex) => {
          const weekdayDateKeys = monthGrid.dateKeysByWeekday[
            weekdayIndex
          ].filter((dateKey) => availableDateKeys.has(dateKey));
          const canPaintColumn =
            !disabledInteractions && weekdayDateKeys.length > 0;

          return (
            <div
              key={`weekday-${year}-${monthIndex}-${weekdayIndex}`}
              className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-md border border-[#eceff3] bg-[#f8fafc] py-1"
            >
              <Tooltip title={labels.paintColumn}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canPaintColumn) return;
                    onPaintDates(weekdayDateKeys);
                  }}
                  disabled={!canPaintColumn}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#dde3ea] bg-white text-[#6b7280] transition hover:border-[#8b5cf6]/50 hover:text-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={labels.paintColumn}
                >
                  <BiBrush className="text-sm" />
                </button>
              </Tooltip>
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.02em] text-[#6b7280]">
                {weekdayLabel}
              </span>
            </div>
          );
        })}

        {monthGrid.rows.map((row) => {
          const rowDateKeys = row.dateKeysInMonth.filter((dateKey) =>
            availableDateKeys.has(dateKey),
          );
          const canPaintRow = !disabledInteractions && rowDateKeys.length > 0;

          return (
            <Fragment key={row.key}>
              <Tooltip title={labels.paintRow}>
                <button
                  type="button"
                  onClick={() => {
                    if (!canPaintRow) return;
                    onPaintDates(rowDateKeys);
                  }}
                  disabled={!canPaintRow}
                  className="mt-auto mb-auto inline-flex h-8 w-7 items-center justify-center rounded-md border border-[#dde3ea] bg-white text-[#6b7280] transition hover:border-[#8b5cf6]/50 hover:text-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={labels.paintRow}
                >
                  <BiBrush className="text-sm" />
                </button>
              </Tooltip>

              {row.cells.map((cell) => {
                const currentTagId = draftByDate[cell.dateKey];
                const hasValidTagId =
                  typeof currentTagId === "number" &&
                  Number.isFinite(currentTagId);
                const tagName = hasValidTagId
                  ? tagNameById[currentTagId]
                  : undefined;
                const tagColor = hasValidTagId
                  ? tagColorById[currentTagId]
                  : undefined;

                const isPaintable =
                  cell.isInMonth &&
                  availableDateKeys.has(cell.dateKey) &&
                  hasAvailableDays;

                return (
                  <DayCell
                    key={cell.dateKey}
                    cell={cell}
                    disabled={disabledInteractions || !isPaintable}
                    isToday={Boolean(
                      todayDateKey && todayDateKey === cell.dateKey,
                    )}
                    tagName={tagName}
                    tagColor={tagColor}
                    isActiveTagMatch={Boolean(
                      activeTagId &&
                      typeof currentTagId === "number" &&
                      currentTagId === activeTagId,
                    )}
                    todayLabel={labels.today}
                    noTagLabel={labels.noTag}
                    outsideMonthLabel={labels.outsideMonth}
                    onPointerDown={onDatePointerDown}
                    onPointerEnter={onDatePointerEnter}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>

      {!hasAvailableDays ? (
        <div className="mt-3 rounded-md border border-dashed border-[#e5e7eb] bg-[#fafafa] px-3 py-2 text-xs text-[#8c8c8c]">
          {labels.monthEmpty}
        </div>
      ) : null}
    </section>
  );
}

const areMonthDraftValuesEqual = (
  prevDraft: PricingCalendarDraft,
  nextDraft: PricingCalendarDraft,
  year: number,
  monthIndex: number,
  weekStart: CalendarWeekStart,
) => {
  const monthGrid = buildMonthGrid(year, monthIndex, weekStart);

  return monthGrid.rows.every((row) =>
    row.dateKeysInMonth.every(
      (dateKey) =>
        (prevDraft[dateKey] ?? null) === (nextDraft[dateKey] ?? null),
    ),
  );
};

export default memo(MonthCalendarGrid, (prev, next) => {
  if (
    prev.year !== next.year ||
    prev.monthIndex !== next.monthIndex ||
    prev.locale !== next.locale ||
    prev.weekStart !== next.weekStart ||
    prev.activeTagId !== next.activeTagId ||
    prev.todayDateKey !== next.todayDateKey ||
    prev.disabledInteractions !== next.disabledInteractions ||
    prev.availableDateKeys !== next.availableDateKeys ||
    prev.tagNameById !== next.tagNameById ||
    prev.tagColorById !== next.tagColorById ||
    prev.labels !== next.labels ||
    prev.onDatePointerDown !== next.onDatePointerDown ||
    prev.onDatePointerEnter !== next.onDatePointerEnter ||
    prev.onPaintDates !== next.onPaintDates
  ) {
    return false;
  }

  return areMonthDraftValuesEqual(
    prev.draftByDate,
    next.draftByDate,
    prev.year,
    prev.monthIndex,
    prev.weekStart,
  );
});
