"use client";

import { useMemo, useState } from "react";
import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";
import type {
  DashboardDateRange,
  DashboardMainDatePreset,
} from "../utils/dashboard-utils";
import {
  isDateRangeGapValid,
  normalizeDateRange,
} from "../utils/dashboard-utils";

interface DashboardOverviewFilterOption {
  label: string;
  value: DashboardMainDatePreset;
}

interface DashboardOverviewFiltersProps {
  presetValue: DashboardMainDatePreset;
  customDateRange: DashboardDateRange;
  presetOptions: DashboardOverviewFilterOption[];
  datePlaceholder: [string, string];
  loading?: boolean;
  onPresetChange: (value: DashboardMainDatePreset) => void;
  onCustomDateRangeChange: (value: DashboardDateRange) => void;
}

type CalendarRangeValue = [Dayjs | null, Dayjs | null] | null;

const getReferenceDate = (value: CalendarRangeValue) => {
  const [start, end] = value ?? [];
  if (start && !end) return start;
  if (!start && end) return end;
  return null;
};

export default function DashboardOverviewFilters({
  presetValue,
  customDateRange,
  presetOptions,
  datePlaceholder,
  loading = false,
  onPresetChange,
  onCustomDateRangeChange,
}: DashboardOverviewFiltersProps) {
  const [calendarValue, setCalendarValue] =
    useState<CalendarRangeValue>(customDateRange);

  const disabledDate = useMemo(
    () => (currentDate: Dayjs, info?: { from?: Dayjs }) => {
      const fromDate = info?.from ?? getReferenceDate(calendarValue);
      if (!fromDate) return false;
      return !isDateRangeGapValid(currentDate, fromDate);
    },
    [calendarValue],
  );

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <Select
        size="large"
        value={presetValue}
        options={presetOptions}
        onChange={(value) => onPresetChange(value)}
        className="w-full text-sm! sm:w-[220px]"
        disabled={loading}
      />

      {presetValue === "custom" ? (
        <DatePicker.RangePicker
          size="large"
          value={customDateRange}
          onCalendarChange={(nextCalendarValue) => {
            setCalendarValue(nextCalendarValue ?? null);
          }}
          onChange={(value) => {
            const startValue = value?.[0];
            const endValue = value?.[1];
            if (!startValue || !endValue) return;
            if (!isDateRangeGapValid(startValue, endValue)) return;
            onCustomDateRangeChange(normalizeDateRange(startValue, endValue));
          }}
          disabledDate={disabledDate}
          format="DD/MM/YYYY"
          allowClear={false}
          inputReadOnly
          placeholder={datePlaceholder}
          className="w-full text-sm! sm:w-[260px]"
          disabled={loading}
        />
      ) : null}
    </div>
  );
}
