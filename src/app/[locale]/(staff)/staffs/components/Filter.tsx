"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";
import { UserRole } from "@/types/request/user";

interface DepartmentOption {
  label: string;
  value: string;
}

interface BranchOption {
  label: string;
  value: string;
}

interface StaffFilterLabels {
  searchPlaceholder: string;
  rolePlaceholder: string;
  departmentPlaceholder: string;
  branchPlaceholder: string;
  statusPlaceholder: string;
  activeLabel: string;
  inactiveLabel: string;
  adminLabel: string;
  staffLabel: string;
}

interface StaffFilterProps {
  loading?: boolean;
  searchValue: string;
  roleValue?: UserRole;
  departmentIdValue?: string;
  branchIdValue?: string;
  statusValue?: "active" | "inactive";
  departmentOptions: DepartmentOption[];
  branchOptions: BranchOption[];
  labels: StaffFilterLabels;
  onSearchChange: (value: string) => void;
  onRoleChange: (value?: UserRole) => void;
  onDepartmentChange: (value?: string) => void;
  onBranchChange: (value?: string) => void;
  onStatusChange: (value?: "active" | "inactive") => void;
}

export default function StaffFilter({
  loading = false,
  searchValue,
  roleValue,
  departmentIdValue,
  branchIdValue,
  statusValue,
  departmentOptions,
  branchOptions,
  labels,
  onSearchChange,
  onRoleChange,
  onDepartmentChange,
  onBranchChange,
  onStatusChange,
}: StaffFilterProps) {
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
        placeholder={labels.rolePlaceholder}
        value={roleValue}
        onChange={(value) => onRoleChange(value)}
        options={[
          { label: labels.adminLabel, value: "admin" },
          { label: labels.staffLabel, value: "staff" },
        ]}
        className="w-full min-w-0 text-sm! sm:min-w-[180px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
        placeholder={labels.departmentPlaceholder}
        value={departmentIdValue}
        onChange={(value) => onDepartmentChange(value)}
        options={departmentOptions}
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
