"use client";

import { DatePicker, Select } from "antd";
import type { Dayjs } from "dayjs";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types/request/support_ticket";

export type SupportTicketsDateRange = [Dayjs | null, Dayjs | null] | null;

interface SupportTicketsFilterLabels {
  statusPlaceholder: string;
  priorityPlaceholder: string;
  datePlaceholders: [string, string];
  pendingLabel: string;
  acceptedLabel: string;
  cancelledLabel: string;
  doneLabel: string;
  lowLabel: string;
  mediumLabel: string;
  highLabel: string;
  urgentLabel: string;
}

interface SupportTicketsFilterProps {
  loading?: boolean;
  statusValue?: SupportTicketStatus;
  priorityValue?: SupportTicketPriority;
  dateRangeValue: SupportTicketsDateRange;
  labels: SupportTicketsFilterLabels;
  onStatusChange: (value?: SupportTicketStatus) => void;
  onPriorityChange: (value?: SupportTicketPriority) => void;
  onDateRangeChange: (value: SupportTicketsDateRange) => void;
}

export default function SupportTicketsFilter({
  loading = false,
  statusValue,
  priorityValue,
  dateRangeValue,
  labels,
  onStatusChange,
  onPriorityChange,
  onDateRangeChange,
}: SupportTicketsFilterProps) {
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
          { label: labels.acceptedLabel, value: "accepted" },
          { label: labels.cancelledLabel, value: "cancelled" },
          { label: labels.doneLabel, value: "done" },
        ]}
        className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
        disabled={loading}
      />

      <Select
        size="large"
        allowClear
        placeholder={labels.priorityPlaceholder}
        value={priorityValue}
        onChange={(value) => onPriorityChange(value)}
        options={[
          { label: labels.lowLabel, value: "low" },
          { label: labels.mediumLabel, value: "medium" },
          { label: labels.highLabel, value: "high" },
          { label: labels.urgentLabel, value: "urgent" },
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
