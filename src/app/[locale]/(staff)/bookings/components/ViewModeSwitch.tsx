"use client";

import { LiaThListSolid } from "react-icons/lia";
import { MdFormatListBulleted } from "react-icons/md";
import { TfiLayoutGrid2 } from "react-icons/tfi";

export type BookingViewMode = "list" | "chart" | "card";

interface BookingViewModeSwitchProps {
  value: BookingViewMode;
  labels: {
    list: string;
    chart: string;
    card: string;
  };
  onChange: (value: BookingViewMode) => void;
}

const viewButtonClassName = (active: boolean) =>
  `h-7 w-10 inline-flex items-center justify-center rounded-md border transition cursor-pointer ${
    active
      ? "border-[#d9d9d9] bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
      : "border-transparent bg-transparent text-[#595959] hover:bg-[#f5f5f5]"
  }`;

export default function BookingViewModeSwitch({
  value,
  labels,
  onChange,
}: BookingViewModeSwitchProps) {
  return (
    <div className="inline-flex items-center justify-end">
      <div className="items-center rounded-md bg-[#f0f0f0] p-0.5">
        <button
          type="button"
          className={viewButtonClassName(value === "list")}
          onClick={() => onChange("list")}
          aria-label={labels.list}
          title={labels.list}
        >
          <LiaThListSolid className="text-[16px]" />
        </button>

        <button
          type="button"
          className={viewButtonClassName(value === "chart")}
          onClick={() => onChange("chart")}
          aria-label={labels.chart}
          title={labels.chart}
        >
          <MdFormatListBulleted className="text-[16px]" />
        </button>

        <button
          type="button"
          className={viewButtonClassName(value === "card")}
          onClick={() => onChange("card")}
          aria-label={labels.card}
          title={labels.card}
        >
          <TfiLayoutGrid2 className="text-[16px]" />
        </button>
      </div>
    </div>
  );
}
