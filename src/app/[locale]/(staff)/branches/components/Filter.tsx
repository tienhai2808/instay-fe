"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";

interface Option {
  label: string;
  value: string;
}

export type BranchStatusFilter = "active" | "inactive";

interface BranchFilterLabels {
  searchPlaceholder: string;
  cityPlaceholder: string;
  statusPlaceholder: string;
  activeLabel: string;
  inactiveLabel: string;
}

interface BranchFilterProps {
  loading?: boolean;
  searchValue: string;
  cityValue?: string;
  statusValue?: BranchStatusFilter;
  cityOptions: Option[];
  labels: BranchFilterLabels;
  onSearchChange: (value: string) => void;
  onCityChange: (value?: string) => void;
  onStatusChange: (value?: BranchStatusFilter) => void;
}

export default function BranchFilter({
  loading = false,
  searchValue,
  cityValue,
  statusValue,
  cityOptions,
  labels,
  onSearchChange,
  onCityChange,
  onStatusChange,
}: BranchFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={labels.searchPlaceholder}
        className="w-full min-w-0 flex-1 text-sm! sm:min-w-[260px] sm:max-w-[480px]"
        size="large"
        prefix={<FiSearch className="text-[#9CA3AF]" />}
        allowClear
      />

      <Select
        size="large"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={labels.cityPlaceholder}
        value={cityValue}
        onChange={(value) => onCityChange(value)}
        options={cityOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
        placeholder={labels.statusPlaceholder}
        value={statusValue}
        onChange={(value) => onStatusChange(value)}
        options={[
          { label: labels.activeLabel, value: "active" },
          { label: labels.inactiveLabel, value: "inactive" },
        ]}
        className="w-full min-w-0 text-sm! sm:min-w-[180px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
