import { Tabs } from "antd";
import type { PointerEvent } from "react";
import type {
  CalendarWeekStart,
  PricingCalendarDraft,
} from "../utils/calendar-utils";
import MonthCalendarGrid from "./MonthCalendarGrid";

interface YearCalendarTabsLabels {
  today: string;
  noTag: string;
  outsideMonth: string;
  paintRow: string;
  paintColumn: string;
  monthEmpty: string;
}

interface YearCalendarTabsProps {
  years: number[];
  locale: string;
  weekStart: CalendarWeekStart;
  draftByDate: PricingCalendarDraft;
  availableDateKeys: Set<string>;
  tagNameById: Record<number, string>;
  tagColorById: Record<number, string>;
  activeTagId: number | null;
  todayDateKey?: string;
  disabledInteractions?: boolean;
  labels: YearCalendarTabsLabels;
  onDatePointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    dateKey: string,
  ) => void;
  onDatePointerEnter: (dateKey: string) => void;
  onPaintDates: (dateKeys: string[]) => void;
}

export default function YearCalendarTabs({
  years,
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
}: YearCalendarTabsProps) {
  const items = years.map((year) => ({
    key: String(year),
    label: String(year),
    children: (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 12 }).map((_, monthIndex) => (
          <MonthCalendarGrid
            key={`${year}-${monthIndex + 1}`}
            year={year}
            monthIndex={monthIndex}
            locale={locale}
            weekStart={weekStart}
            draftByDate={draftByDate}
            availableDateKeys={availableDateKeys}
            tagNameById={tagNameById}
            tagColorById={tagColorById}
            activeTagId={activeTagId}
            todayDateKey={todayDateKey}
            disabledInteractions={disabledInteractions}
            labels={labels}
            onDatePointerDown={onDatePointerDown}
            onDatePointerEnter={onDatePointerEnter}
            onPaintDates={onPaintDates}
          />
        ))}
      </div>
    ),
  }));

  return (
    <Tabs
      defaultActiveKey={items[0]?.key}
      items={items}
      className="[&_.ant-tabs-nav]:mb-4 [&_.ant-tabs-tab]:px-4 [&_.ant-tabs-tab-btn]:text-sm [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:font-semibold"
    />
  );
}
