"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";

export type EventStatusFilter = "active" | "inactive";

interface EventsFilterLabels {
  searchPlaceholder: string;
  branchPlaceholder: string;
  statusPlaceholder: string;
  activeLabel: string;
  inactiveLabel: string;
}

interface BranchOption {
  label: string;
  value: string;
}

interface EventsFilterProps {
  loading?: boolean;
  searchValue: string;
  branchIdValue?: string;
  statusValue?: EventStatusFilter;
  branchOptions: BranchOption[];
  labels: EventsFilterLabels;
  onSearchChange: (value: string) => void;
  onBranchChange: (value?: string) => void;
  onStatusChange: (value?: EventStatusFilter) => void;
}

export default function EventFilter({
  loading = false,
  searchValue,
  branchIdValue,
  statusValue,
  branchOptions,
  labels,
  onSearchChange,
  onBranchChange,
  onStatusChange,
}: EventsFilterProps) {
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
        placeholder={labels.branchPlaceholder}
        value={branchIdValue}
        onChange={(value) => onBranchChange(value)}
        options={branchOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[180px] sm:w-auto"
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
