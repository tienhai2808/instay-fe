"use client";

import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";
import type { ReviewSortOrder } from "@/types/request/review";

export type ReviewsDateRange = [Dayjs | null, Dayjs | null] | null;

interface ReviewsFilterLabels {
  datePlaceholders: [string, string];
  orderPlaceholder: string;
  newestFirst: string;
  oldestFirst: string;
}

interface ReviewsFilterProps {
  loading?: boolean;
  dateRangeValue: ReviewsDateRange;
  orderValue: ReviewSortOrder;
  labels: ReviewsFilterLabels;
  onDateRangeChange: (value: ReviewsDateRange) => void;
  onOrderChange: (value: ReviewSortOrder) => void;
}

export default function ReviewsFilter({
  loading = false,
  dateRangeValue,
  orderValue,
  labels,
  onDateRangeChange,
  onOrderChange,
}: ReviewsFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DatePicker.RangePicker
        size="large"
        value={dateRangeValue}
        onChange={(value) => {
          onDateRangeChange(value ?? null);
        }}
        format="DD/MM/YYYY"
        allowEmpty={[true, true]}
        placeholder={labels.datePlaceholders}
        className="w-full text-sm! h-[36.34px]! sm:min-w-[260px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        value={orderValue}
        onChange={(value) => onOrderChange(value)}
        options={[
          { label: labels.newestFirst, value: "desc" },
          { label: labels.oldestFirst, value: "asc" },
        ]}
        placeholder={labels.orderPlaceholder}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
