"use client";

import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";
import type { OrderServiceStatus } from "@/types/request/order_service";

export type OrderServicesDateRange = [Dayjs | null, Dayjs | null] | null;

interface OrderServicesFilterLabels {
  statusPlaceholder: string;
  datePlaceholders: [string, string];
  pendingLabel: string;
  confirmedLabel: string;
  cancelledLabel: string;
}

interface OrderServicesFilterProps {
  loading?: boolean;
  statusValue?: OrderServiceStatus;
  dateRangeValue: OrderServicesDateRange;
  labels: OrderServicesFilterLabels;
  onStatusChange: (value?: OrderServiceStatus) => void;
  onDateRangeChange: (value: OrderServicesDateRange) => void;
}

export default function OrderServicesFilter({
  loading = false,
  statusValue,
  dateRangeValue,
  labels,
  onStatusChange,
  onDateRangeChange,
}: OrderServicesFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        size="large"
        allowClear
        placeholder={labels.statusPlaceholder}
        value={statusValue}
        onChange={(value) => onStatusChange(value)}
        options={[
          { label: labels.pendingLabel, value: "pending" },
          { label: labels.confirmedLabel, value: "confirmed" },
          { label: labels.cancelledLabel, value: "cancelled" },
        ]}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <DatePicker.RangePicker
        size="large"
        value={dateRangeValue}
        onChange={(value) => {
          onDateRangeChange(value ?? null);
        }}
        format="DD/MM/YYYY"
        allowEmpty={[true, true]}
        placeholder={labels.datePlaceholders}
        className="w-full text-sm! h-[36.34px]! sm:min-w-[260px] sm:w-auto"
        disabled={loading}
      />
    </div>
  );
}
