"use client";

import { DatePicker, Input, Select } from "antd";
import type { Dayjs } from "dayjs";
import { FiSearch } from "react-icons/fi";

export type BookingListDateRange = [Dayjs | null, Dayjs | null] | null;

interface BookingSourceFilterOption {
  label: string;
  value: string;
}

interface BookingBranchFilterOption {
  label: string;
  value: string;
}

interface BookingListFilterProps {
  loading?: boolean;
  searchValue: string;
  sourceValue?: string;
  branchValue?: string;
  dateRangeValue: BookingListDateRange;
  searchPlaceholder: string;
  sourcePlaceholder: string;
  branchPlaceholder: string;
  datePlaceholder: [string, string];
  sourceOptions: BookingSourceFilterOption[];
  branchOptions: BookingBranchFilterOption[];
  onSearchChange: (value: string) => void;
  onSourceChange: (value?: string) => void;
  onBranchChange: (value?: string) => void;
  onDateRangeChange: (value: BookingListDateRange) => void;
}

export default function BookingListFilter({
  loading = false,
  searchValue,
  sourceValue,
  branchValue,
  dateRangeValue,
  searchPlaceholder,
  sourcePlaceholder,
  branchPlaceholder,
  datePlaceholder,
  sourceOptions,
  branchOptions,
  onSearchChange,
  onSourceChange,
  onBranchChange,
  onDateRangeChange,
}: BookingListFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full min-w-0 flex-1 text-sm! sm:min-w-[280px] sm:max-w-[480px]"
        size="large"
        prefix={<FiSearch className="text-[#9CA3AF]" />}
        allowClear
      />

      <Select
        size="large"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={sourcePlaceholder}
        value={sourceValue}
        onChange={(value) => onSourceChange(value)}
        options={sourceOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

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

      <DatePicker.RangePicker
        size="large"
        value={dateRangeValue}
        onChange={(value) => {
          onDateRangeChange(value ?? null);
        }}
        format="DD/MM/YYYY"
        allowEmpty={[true, true]}
        placeholder={datePlaceholder}
        className="w-full text-sm! h-[36.34px]! sm:min-w-[260px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
