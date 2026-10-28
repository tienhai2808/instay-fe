"use client";

import type { RoomTimelineStatusSummary } from "@/types/response/room";

export type RoomTimelineStatusKey =
  | "all"
  | "available"
  | "occupied"
  | "upcoming_checkin"
  | "overdue_checkout"
  | "overdue_checkin";

interface RoomTimelineStatusLabels {
  all: string;
  available: string;
  occupied: string;
  upcoming_checkin: string;
  overdue_checkout: string;
  overdue_checkin: string;
}

interface RoomTimelineStatusChipsProps {
  status?: RoomTimelineStatusSummary;
  labels: RoomTimelineStatusLabels;
}

const chipClassNameByStatus: Record<RoomTimelineStatusKey, string> = {
  all: "border-[#d9d9d9] bg-white text-[#595959]",
  available: "border-[#7ad9d0] bg-[#e9faf8] text-[#16b8a9]",
  occupied: "border-[#91caff] bg-[#f0f7ff] text-[#1677ff]",
  upcoming_checkin: "border-[#d3adf7] bg-[#f9f0ff] text-[#722ed1]",
  overdue_checkout: "border-[#ffcdc7] bg-[#fff1f0] text-[#ff4d4f]",
  overdue_checkin: "border-[#ffd591] bg-[#fff7e6] text-[#fa8c16]",
};

export default function RoomTimelineStatusChips({
  status,
  labels,
}: RoomTimelineStatusChipsProps) {
  const options: Array<{ key: RoomTimelineStatusKey; label: string }> = [
    { key: "all", label: labels.all },
    { key: "available", label: labels.available },
    { key: "occupied", label: labels.occupied },
    { key: "upcoming_checkin", label: labels.upcoming_checkin },
    { key: "overdue_checkout", label: labels.overdue_checkout },
    { key: "overdue_checkin", label: labels.overdue_checkin },
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
