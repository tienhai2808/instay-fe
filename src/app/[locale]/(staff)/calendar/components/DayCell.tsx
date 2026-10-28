import { memo, type PointerEvent } from "react";
import type { CalendarMonthCell } from "../utils/calendar-utils";
import { toRgbaColor } from "../utils/calendar-utils";

interface DayCellProps {
  cell: CalendarMonthCell;
  disabled: boolean;
  isToday: boolean;
  tagName?: string;
  tagColor?: string;
  isActiveTagMatch?: boolean;
  todayLabel: string;
  noTagLabel: string;
  outsideMonthLabel: string;
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    dateKey: string,
  ) => void;
  onPointerEnter: (dateKey: string) => void;
}

function DayCell({
  cell,
  disabled,
  isToday,
  tagName,
  tagColor,
  isActiveTagMatch = false,
  todayLabel,
  noTagLabel,
  outsideMonthLabel,
  onPointerDown,
  onPointerEnter,
}: DayCellProps) {
  const hasTag = Boolean(tagColor && tagName);

  const tooltipTitle = [
    cell.dateKey,
    cell.isInMonth ? tagName || noTagLabel : outsideMonthLabel,
    isToday ? todayLabel : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const dynamicStyle =
    cell.isInMonth && tagColor
      ? {
          backgroundColor: toRgbaColor(
            tagColor,
            isActiveTagMatch ? 0.24 : 0.14,
          ),
          borderColor: toRgbaColor(tagColor, isActiveTagMatch ? 0.9 : 0.75),
        }
      : undefined;

  return (
    <button
      type="button"
      title={tooltipTitle}
      onPointerDown={(event) => {
        if (disabled || !cell.isInMonth) return;
        onPointerDown(event, cell.dateKey);
      }}
      onPointerEnter={() => {
        if (disabled || !cell.isInMonth) return;
        onPointerEnter(cell.dateKey);
      }}
      disabled={disabled || !cell.isInMonth}
      className={`group flex h-[48px] min-h-[48px] w-full flex-col items-start justify-between rounded-lg border px-1.5 py-1.5 text-left select-none transition sm:h-[52px] sm:min-h-[52px] sm:px-2 ${
        cell.isInMonth
          ? "bg-white text-[#111827] hover:border-[#8b5cf6]/50 hover:shadow-[0_1px_2px_rgba(124,58,237,0.12)]"
          : "bg-[#f5f5f5] text-[#bfbfbf] border-[#ececec] cursor-not-allowed"
      } ${
        isToday && cell.isInMonth
          ? "ring-1 ring-[#8b5cf6]/35 border-[#8b5cf6]/60"
          : "border-[#e8e8e8]"
      } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
      style={dynamicStyle}
    >
      <span
        className={`text-xs leading-none font-semibold ${
          isToday && cell.isInMonth ? "text-[#7c3aed]" : ""
        }`}
      >
        {cell.day}
      </span>

      {hasTag ? (
        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#ececec] bg-white/90 px-1.5 py-[2px] text-[10px] leading-none text-[#111827]">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: tagColor }}
          />
          <span className="truncate">{tagName}</span>
        </span>
      ) : cell.isInMonth ? (
        <span className="text-[10px] leading-none text-[#b0b0b0]">&nbsp;</span>
      ) : null}
    </button>
  );
}

export default memo(DayCell, (prev, next) => {
  return (
    prev.cell.dateKey === next.cell.dateKey &&
    prev.cell.day === next.cell.day &&
    prev.cell.isInMonth === next.cell.isInMonth &&
    prev.disabled === next.disabled &&
    prev.isToday === next.isToday &&
    prev.tagName === next.tagName &&
    prev.tagColor === next.tagColor &&
    prev.isActiveTagMatch === next.isActiveTagMatch &&
    prev.todayLabel === next.todayLabel &&
    prev.noTagLabel === next.noTagLabel &&
    prev.outsideMonthLabel === next.outsideMonthLabel &&
    prev.onPointerDown === next.onPointerDown &&
    prev.onPointerEnter === next.onPointerEnter
  );
});
