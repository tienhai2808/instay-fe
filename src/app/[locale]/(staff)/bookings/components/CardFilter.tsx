"use client";

import { Input, Select } from "antd";
import { FiSearch } from "react-icons/fi";

interface Option {
  label: string;
  value: string;
}

interface BookingRoomsTimelineFilterLabels {
  searchPlaceholder: string;
  branchPlaceholder: string;
  roomTypePlaceholder: string;
  floorPlaceholder: string;
}

interface BookingRoomsTimelineFilterProps {
  loading?: boolean;
  searchValue: string;
  branchIdValue?: string;
  roomTypeIdValue?: string;
  floorIdValue?: string;
  branchOptions: Option[];
  roomTypeOptions: Option[];
  floorOptions: Option[];
  labels: BookingRoomsTimelineFilterLabels;
  onSearchChange: (value: string) => void;
  onBranchChange: (value?: string) => void;
  onRoomTypeChange: (value?: string) => void;
  onFloorChange: (value?: string) => void;
}

export default function BookingRoomsTimelineFilter({
  loading = false,
  searchValue,
  branchIdValue,
  roomTypeIdValue,
  floorIdValue,
  branchOptions,
  roomTypeOptions,
  floorOptions,
  labels,
  onSearchChange,
  onBranchChange,
  onRoomTypeChange,
  onFloorChange,
}: BookingRoomsTimelineFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={labels.searchPlaceholder}
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
        placeholder={labels.branchPlaceholder}
        value={branchIdValue}
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
        placeholder={labels.roomTypePlaceholder}
        value={roomTypeIdValue}
        onChange={(value) => onRoomTypeChange(value)}
        options={roomTypeOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={labels.floorPlaceholder}
        value={floorIdValue}
        onChange={(value) => onFloorChange(value)}
        options={floorOptions}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
