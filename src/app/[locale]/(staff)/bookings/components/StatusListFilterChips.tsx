"use client";

import {
  BookingStatusFilterValue,
  getStatusListFilterChipClassName,
} from "../utils/booking-status";

interface BookingStatusFilterOption {
  value: BookingStatusFilterValue;
  label: string;
  count: number;
}

interface BookingStatusFilterChipsProps {
  value: BookingStatusFilterValue;
  options: BookingStatusFilterOption[];
  onChange: (value: BookingStatusFilterValue) => void;
}

export default function BookingStatusListFilterChips({
  value,
  options,
  onChange,
}: BookingStatusFilterChipsProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={getStatusListFilterChipClassName(option.value, isActive)}
            onClick={() => onChange(option.value)}
          >
            {option.label} ({option.count})
          </button>
        );
      })}
    </div>
  );
}
