"use client";

import type { BookingTimelineStatusSummary } from "@/types/response/booking";

type BookingTimelineStatusKey = "all" | "available" | "occupied" | "booked";

interface BookingTimelineStatusLabels {
  all: string;
  available: string;
  occupied: string;
  booked: string;
}

interface BookingTimelineStatusChipsProps {
  status?: BookingTimelineStatusSummary;
  labels: BookingTimelineStatusLabels;
}

const chipClassNameByStatus: Record<BookingTimelineStatusKey, string> = {
  all: "border-[#d9d9d9] bg-white text-[#595959]",
  available: "border-[#7ad9d0] bg-[#e9faf8] text-[#16b8a9]",
  occupied: "border-[#91caff] bg-[#f0f7ff] text-[#1677ff]",
  booked: "border-[#d3adf7] bg-[#f9f0ff] text-[#722ed1]",
};

export default function BookingTimelineStatusChips({
  status,
  labels,
}: BookingTimelineStatusChipsProps) {
  const options: Array<{ key: BookingTimelineStatusKey; label: string }> = [
    { key: "all", label: labels.all },
    { key: "available", label: labels.available },
    { key: "occupied", label: labels.occupied },
    { key: "booked", label: labels.booked },
  ];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {options.map((option) => (
        <span
          key={option.key}
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-sm font-semibold ${chipClassNameByStatus[option.key]}`}
        >
          {option.label} ({status?.[option.key] ?? 0})
        </span>
      ))}
    </div>
  );
}
