"use client";

import { DatePicker, Input } from "antd";
import type { Dayjs } from "dayjs";
import { FiSearch } from "react-icons/fi";

export type AccommodationDateRange = [Dayjs | null, Dayjs | null] | null;

interface AccommodationFilterProps {
  loading?: boolean;
  searchValue: string;
  dateRangeValue: AccommodationDateRange;
  searchPlaceholder: string;
  datePlaceholder: [string, string];
  onSearchChange: (value: string) => void;
  onDateRangeChange: (value: AccommodationDateRange) => void;
}

export default function AccommodationFilter({
  loading = false,
  searchValue,
  dateRangeValue,
  searchPlaceholder,
  datePlaceholder,
  onSearchChange,
  onDateRangeChange,
}: AccommodationFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full min-w-0 flex-1 text-sm! sm:min-w-[280px] sm:max-w-[520px]"
        size="large"
        prefix={<FiSearch className="text-[#9CA3AF]" />}
        allowClear
      />

      <DatePicker.RangePicker
        size="large"
        value={dateRangeValue}
        onChange={(value) => {
          onDateRangeChange(value ?? null);
        }}
        format="DD/MM/YYYY"
        allowEmpty={[true, true]}
        placeholder={datePlaceholder}
        className="w-full text-sm! h-[36.34px]! sm:min-w-[280px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
