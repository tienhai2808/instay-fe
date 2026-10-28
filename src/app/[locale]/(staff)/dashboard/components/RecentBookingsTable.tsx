"use client";

import { useCallback, useMemo } from "react";
import { Empty, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { LOCALE_VI } from "@/constants/locale";
import type { Booking } from "@/types/data/booking";

interface RecentBookingsTableProps {
  items: Booking[];
  loading?: boolean;
}

const resolveStatusClassName = (status: string) => {
  if (status === "checked-in") {
    return "bg-[#dcfce7] text-[#15803d]";
  }
  if (status === "confirmed") {
    return "bg-[#dbeafe] text-[#1d4ed8]";
  }
  if (status === "cancelled") {
    return "bg-[#fee2e2] text-[#b91c1c]";
  }
  if (status === "checked-out") {
    return "bg-[#f3f4f6] text-[#4b5563]";
  }
  return "bg-[#f3f4f6] text-[#4b5563]";
};

export default function RecentBookingsTable({
  items,
  loading = false,
}: RecentBookingsTableProps) {
  const t = useTranslations("DashboardPage");
  const locale = useLocale();
  const router = useRouter();
  const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [language],
  );

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return "-";
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return "-";
      return dateFormatter.format(parsed);
    },
    [dateFormatter],
  );

  const columns = useMemo<ColumnsType<Booking>>(
    () => [
      {
        title: t("table.columns.bookingId"),
        key: "booking_number",
        dataIndex: "booking_number",
        ellipsis: true,
        render: (value: string | undefined) => value?.trim() || "-",
      },
      {
        title: t("table.columns.customerName"),
        key: "guest_full_name",
        dataIndex: "guest_full_name",
        ellipsis: true,
        render: (value: string | undefined) => value?.trim() || "-",
      },
      {
        title: t("table.columns.roomId"),
        key: "room_type",
        ellipsis: true,
        render: (_, booking) => booking.room_type?.name?.trim() || "-",
      },
      {
        title: t("table.columns.checkIn"),
        key: "check_in",
        dataIndex: "check_in",
        render: (value: string | undefined) => formatDate(value),
      },
      {
        title: t("table.columns.checkOut"),
        key: "check_out",
        dataIndex: "check_out",
        render: (value: string | undefined) => formatDate(value),
      },
      {
        title: t("table.columns.status"),
        key: "status",
        dataIndex: "status",
        render: (value: string | undefined) => {
          const status = value?.trim() || "unknown";
          return (
            <span
              className={`inline-flex min-w-[110px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${resolveStatusClassName(
                status,
              )}`}
            >
              {t(`statuses.${status}`)}
            </span>
          );
        },
      },
    ],
    [formatDate, t],
  );

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-3">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[#111827]">
          {t("table.title")}
        </h2>
        <Link
          href="/bookings"
          className="inline-flex h-8 items-center rounded-lg border border-[#2563eb] bg-white px-4 text-sm text-[#2563eb] transition-colors hover:bg-[#eff6ff]"
        >
          {t("table.actions.viewAllBookings")}
        </Link>
      </div>

      <Table<Booking>
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={false}
        scroll={{ x: 940 }}
        locale={{
          emptyText: <Empty description={t("empty.noBookings")} />,
        }}
        onRow={(record) => ({
          onClick: () => router.push(`/bookings/${record.id}`),
        })}
        className="[&_.ant-table-measure-row]:hidden [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#374151] [&_.ant-table-container]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!bg-[#e5e7eb] [&_.ant-table-tbody>tr>td]:!h-12 [&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:!align-middle [&_.ant-table-row]:cursor-pointer [&_.ant-table-row:hover>td]:!bg-[#fafafa]"
      />
    </section>
  );
}
