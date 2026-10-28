"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";

interface Option {
  label: string;
  value: string;
}

interface SupportCategoriesFilterLabels {
  searchPlaceholder: string;
  departmentPlaceholder: string;
}

interface SupportCategoriesFilterProps {
  loading?: boolean;
  searchValue: string;
  departmentIdValue?: string;
  departmentOptions: Option[];
  labels: SupportCategoriesFilterLabels;
  onSearchChange: (value: string) => void;
  onDepartmentChange: (value?: string) => void;
}

export default function SupportCategoriesFilter({
  loading = false,
  searchValue,
  departmentIdValue,
  departmentOptions,
  labels,
  onSearchChange,
  onDepartmentChange,
}: SupportCategoriesFilterProps) {
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
        placeholder={labels.departmentPlaceholder}
        value={departmentIdValue}
        onChange={(value) => onDepartmentChange(value)}
        options={departmentOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
