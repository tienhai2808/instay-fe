"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";

interface Option {
  label: string;
  value: string;
}

export type ServiceStatusFilter = "active" | "inactive";

interface ServicesFilterLabels {
  searchPlaceholder: string;
  serviceTypePlaceholder: string;
  branchPlaceholder: string;
  statusPlaceholder: string;
  activeLabel: string;
  inactiveLabel: string;
}

interface ServicesFilterProps {
  loading?: boolean;
  searchValue: string;
  serviceTypeIdValue?: string;
  branchIdValue?: string;
  statusValue?: ServiceStatusFilter;
  serviceTypeOptions: Option[];
  branchOptions: Option[];
  labels: ServicesFilterLabels;
  onSearchChange: (value: string) => void;
  onServiceTypeChange: (value?: string) => void;
  onBranchChange: (value?: string) => void;
  onStatusChange: (value?: ServiceStatusFilter) => void;
}

export default function ServicesFilter({
  loading = false,
  searchValue,
  serviceTypeIdValue,
  branchIdValue,
  statusValue,
  serviceTypeOptions,
  branchOptions,
  labels,
  onSearchChange,
  onServiceTypeChange,
  onBranchChange,
  onStatusChange,
}: ServicesFilterProps) {
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
        placeholder={labels.serviceTypePlaceholder}
        value={serviceTypeIdValue}
        onChange={(value) => onServiceTypeChange(value)}
        options={serviceTypeOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[180px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
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
