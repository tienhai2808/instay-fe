"use client";

import { useCallback, useMemo } from "react";
import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LOCALE_VI } from "@/constants/locale";
import type { SupportTicket } from "@/types/data/support_ticket";
import type { SupportTicketStatus } from "@/types/request/support_ticket";

interface RecentSupportTicketsTableProps {
  items: SupportTicket[];
  loading?: boolean;
}

const resolveStatusClassName = (status: SupportTicketStatus | undefined) => {
  if (status === "pending") {
    return "bg-[#fff7ed] text-[#ea580c]";
  }
  if (status === "accepted") {
    return "bg-[#dbeafe] text-[#1d4ed8]";
  }
  if (status === "done") {
    return "bg-[#dcfce7] text-[#15803d]";
  }
  if (status === "cancelled") {
    return "bg-[#fee2e2] text-[#b91c1c]";
  }
  return "bg-[#f3f4f6] text-[#4b5563]";
};

const toNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

export default function RecentSupportTicketsTable({
  items,
  loading = false,
}: RecentSupportTicketsTableProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [language],
  );

  const durationFormatter = useMemo(
    () =>
      new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      }),
    [language],
  );

  const formatDateTime = useCallback(
    (value?: string) => {
      if (!value) return "-";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "-";
      return dateTimeFormatter.format(parsed);
    },
    [dateTimeFormatter],
  );

  const resolveStatusLabel = useCallback(
    (value?: SupportTicketStatus) => {
      if (value === "accepted") return t("operation.statuses.accepted");
      if (value === "cancelled") return t("operation.statuses.cancelled");
      if (value === "done") return t("operation.statuses.done");
      return t("operation.statuses.pending");
    },
    [t],
  );

  const formatResolutionDuration = useCallback(
    (value?: number | null) => {
      const safeSeconds = toNonNegativeNumber(value);
      if (safeSeconds === undefined) return "-";

      if (safeSeconds >= 3600) {
        return `${durationFormatter.format(safeSeconds / 3600)} ${t(
          "operation.table.duration.hours",
        )}`;
      }

      if (safeSeconds >= 60) {
        return `${durationFormatter.format(safeSeconds / 60)} ${t(
          "operation.table.duration.minutes",
        )}`;
      }

      return `${durationFormatter.format(safeSeconds)} ${t(
        "operation.table.duration.seconds",
      )}`;
    },
    [durationFormatter, t],
  );

  const columns = useMemo<ColumnsType<SupportTicket>>(
    () => [
      {
        title: t("operation.table.columns.requestType"),
        key: "requestType",
        ellipsis: true,
        width: 210,
        render: (_, record) => record.support_category?.name?.trim() || "-",
      },
      {
        title: t("operation.table.columns.room"),
        key: "room",
        ellipsis: true,
        width: 120,
        render: (_, record) => record.booking_room?.room?.name?.trim() || "-",
      },
      {
        title: t("operation.table.columns.time"),
        key: "created_at",
        dataIndex: "created_at",
        width: 170,
        render: (value?: string) => formatDateTime(value),
      },
      {
        title: t("operation.table.columns.status"),
        key: "status",
        dataIndex: "status",
        width: 140,
        render: (value?: SupportTicketStatus) => (
          <span
            className={`inline-flex min-w-[110px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${resolveStatusClassName(
              value,
            )}`}
          >
            {resolveStatusLabel(value)}
          </span>
        ),
      },
      {
        title: t("operation.table.columns.completedAt"),
        key: "resolution_seconds",
        dataIndex: "resolution_seconds",
        width: 170,
        render: (value?: number | null) => formatResolutionDuration(value),
      },
    ],
    [formatDateTime, formatResolutionDuration, resolveStatusLabel, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#111827]">
          {t("operation.table.title")}
        </h2>
        <Link
          href="/support-tickets"
          className="inline-flex h-8 items-center rounded-lg border border-[#2563eb] bg-white px-4 text-sm text-[#2563eb] transition-colors hover:bg-[#eff6ff]"
        >
          {t("operation.table.actions.viewAllSupportTickets")}
        </Link>
      </div>

      <Table<SupportTicket>
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={false}
        scroll={{ x: 900 }}
        locale={{
          emptyText: <Empty description={t("empty.noSupportTickets")} />,
        }}
        className="[&_.ant-table-measure-row]:hidden [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#374151] [&_.ant-table-container]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!bg-[#e5e7eb] [&_.ant-table-tbody>tr>td]:!h-12 [&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:!align-middle"
      />
    </section>
  );
}
