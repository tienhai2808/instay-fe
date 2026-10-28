"use client";

import { useMemo, useState } from "react";
import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";

export type BookingTimelineDateRange = [Dayjs, Dayjs];

interface BookingTimelineRoomTypeOption {
  label: string;
  value: string;
}

interface BookingTimelineBranchOption {
  label: string;
  value: string;
}

interface BookingTimelineFilterProps {
  loading?: boolean;
  branchValue?: string;
  roomTypeValue?: string;
  dateRangeValue: BookingTimelineDateRange;
  branchPlaceholder: string;
  roomTypePlaceholder: string;
  datePlaceholder: [string, string];
  branchOptions: BookingTimelineBranchOption[];
  roomTypeOptions: BookingTimelineRoomTypeOption[];
  onBranchChange: (value?: string) => void;
  onRoomTypeChange: (value?: string) => void;
  onDateRangeChange: (value: BookingTimelineDateRange) => void;
}

const MIN_RANGE_DAYS = 5;
const MAX_RANGE_DAYS = 30;
const MIN_GAP_DAYS = MIN_RANGE_DAYS - 1;
const MAX_GAP_DAYS = MAX_RANGE_DAYS - 1;

type CalendarRangeValue = [Dayjs | null, Dayjs | null] | null;

const getAbsoluteDayGap = (first: Dayjs, second: Dayjs) => {
  return Math.abs(second.startOf("day").diff(first.startOf("day"), "day"));
};

const isGapInAllowedRange = (gapInDays: number) => {
  return gapInDays >= MIN_GAP_DAYS && gapInDays <= MAX_GAP_DAYS;
};

const getReferenceDate = (value: CalendarRangeValue) => {
  const [start, end] = value ?? [];
  if (start && !end) return start;
  if (!start && end) return end;
  return null;
};

export default function BookingTimelineFilter({
  loading = false,
  branchValue,
  roomTypeValue,
  dateRangeValue,
  branchPlaceholder,
  roomTypePlaceholder,
  datePlaceholder,
  branchOptions,
  roomTypeOptions,
  onBranchChange,
  onRoomTypeChange,
  onDateRangeChange,
}: BookingTimelineFilterProps) {
  const [calendarValue, setCalendarValue] =
    useState<CalendarRangeValue>(dateRangeValue);

  const disabledDate = useMemo(
    () => (currentDate: Dayjs, info?: { from?: Dayjs }) => {
      const fromDate = info?.from ?? getReferenceDate(calendarValue);
      if (!fromDate) return false;

      const gapInDays = getAbsoluteDayGap(currentDate, fromDate);
      return !isGapInAllowedRange(gapInDays);
    },
    [calendarValue],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        size="large"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={branchPlaceholder}
        value={branchValue}
        onChange={(value) => onBranchChange(value)}
        options={branchOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={roomTypePlaceholder}
        value={roomTypeValue}
        onChange={(value) => onRoomTypeChange(value)}
        options={roomTypeOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <DatePicker.RangePicker
        size="large"
        value={dateRangeValue}
        onCalendarChange={(nextCalendarValue) => {
          setCalendarValue(nextCalendarValue ?? null);
        }}
        onChange={(value) => {
          const startValue = value?.[0];
          const endValue = value?.[1];
          if (!startValue || !endValue) return;

          const gapInDays = getAbsoluteDayGap(startValue, endValue);
          if (!isGapInAllowedRange(gapInDays)) return;

          const normalizedRange: BookingTimelineDateRange = startValue.isAfter(
            endValue,
            "day",
          )
            ? [endValue, startValue]
            : [startValue, endValue];

          onDateRangeChange(normalizedRange);
          setCalendarValue(normalizedRange);
        }}
        disabledDate={disabledDate}
        format="DD/MM/YYYY"
        allowClear={false}
        inputReadOnly
        placeholder={datePlaceholder}
        className="w-full text-sm! h-[36.34px]! sm:min-w-[260px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
