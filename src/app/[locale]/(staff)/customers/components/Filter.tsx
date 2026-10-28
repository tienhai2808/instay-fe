"use client";

import { Input } from "antd";
import { FiSearch } from "react-icons/fi";

interface CustomersFilterProps {
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
}

export default function CustomersFilter({
  searchValue,
  searchPlaceholder,
  onSearchChange,
}: CustomersFilterProps) {
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
    </div>
  );
}
