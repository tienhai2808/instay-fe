"use client";

import { useMemo } from "react";
import { Dropdown, Empty, Popconfirm, Rate, Table, Tabs, Tag } from "antd";
import type { MenuProps, TableProps, TabsProps } from "antd";
import { BiEditAlt, BiPlus, BiTrashAlt } from "react-icons/bi";
import { FiMoreVertical } from "react-icons/fi";
import { PiScanDuotone } from "react-icons/pi";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type {
  BookingRoomGuest,
  BookingRoomOrderService,
  BookingRoomReview,
  BookingRoomSupportTicket,
} from "@/types/data/booking_room";
import {
  EMPTY_VALUE,
  formatEnumLabel,
  getStateTagClassName,
} from "../utils/booking-room-details-modal";

export type BookingRoomDetailsTabKey =
  | "stay"
  | "services"
  | "support"
  | "review";

interface BookingRoomDetailsTabsProps {
  activeTab: BookingRoomDetailsTabKey;
  showTabNavigation?: boolean;
  guests: BookingRoomGuest[];
  orderServices: BookingRoomOrderService[];
  supportTickets: BookingRoomSupportTicket[];
  review?: BookingRoomReview | null;
  canAccessStayTab: boolean;
  canAccessServicesTab: boolean;
  canAccessSupportTab: boolean;
  isCheckedInStatus: boolean;
  canStartVerification: boolean;
  verificationPending?: boolean;
  canAddAction: boolean;
  onTabChange: (tab: BookingRoomDetailsTabKey) => void;
  onStartVerification: () => void;
  onAddGuest: () => void;
  onAddServiceOrder: () => void;
  onEditGuest: (guest: BookingRoomGuest) => void;
  onDeleteGuest: (guestId: string) => void;
}

export default function BookingRoomDetailsTabs({
  activeTab,
  showTabNavigation = true,
  guests,
  orderServices,
  supportTickets,
  review,
  canAccessStayTab,
  canAccessServicesTab,
  canAccessSupportTab,
  isCheckedInStatus,
  canStartVerification,
  verificationPending = false,
  canAddAction,
  onTabChange,
  onStartVerification,
  onAddGuest,
  onAddServiceOrder,
  onEditGuest,
  onDeleteGuest,
}: BookingRoomDetailsTabsProps) {
  const t = useTranslations("BookingsPage");
  const locale = useLocale();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const formatDate = (value?: string) => {
    if (!value) return EMPTY_VALUE;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return EMPTY_VALUE;

    return dateFormatter.format(parsed);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return EMPTY_VALUE;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return EMPTY_VALUE;

    return dateTimeFormatter.format(parsed);
  };

  const formatCurrency = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return EMPTY_VALUE;
    return `${currencyFormatter.format(value)} VND`;
  };

  const isStayTab = activeTab === "stay";
  const isServicesTab = activeTab === "services";
  const shouldShowAddAction =
    (isStayTab && canAccessStayTab) || (isServicesTab && canAccessServicesTab);

  const stayColumns: TableProps<BookingRoomGuest>["columns"] = [
    {
      title: t("detailPage.bookingRoomDetailsModal.table.index"),
      key: "index",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.guestName"),
      dataIndex: "full_name",
      key: "full_name",
      render: (value?: string) => value || EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.dob"),
      dataIndex: "dob",
      key: "dob",
      render: (value?: string) => formatDate(value),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.national"),
      dataIndex: "national",
      key: "national",
      render: (value?: string) => value || EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.passport"),
      dataIndex: "passport_number",
      key: "passport_number",
      render: (value?: string) => value || EMPTY_VALUE,
    },
    {
      title: "",
      key: "actions",
      width: 64,
      align: "right",
      render: (_, record) =>
        canAddAction ? (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "edit",
                  label: t("detailPage.bookingRoomDetailsModal.actions.edit"),
                  onClick: () => onEditGuest(record),
                  icon: <BiEditAlt className="text-base! text-blue-500" />,
                },
                {
                  key: "delete",
                  label: (
                    <Popconfirm
                      title={t(
                        "detailPage.bookingRoomDetailsModal.guestModal.delete.title",
                      )}
                      description={t(
                        "detailPage.bookingRoomDetailsModal.guestModal.delete.description",
                      )}
                      onConfirm={() => {
                        onDeleteGuest(record.id);
                      }}
                      okText={t(
                        "detailPage.bookingRoomDetailsModal.guestModal.delete.confirm",
                      )}
                      cancelText={t(
                        "detailPage.bookingRoomDetailsModal.actions.cancel",
                      )}
                      okButtonProps={{ danger: true }}
                    >
                      <span>
                        {t("detailPage.bookingRoomDetailsModal.actions.delete")}
                      </span>
                    </Popconfirm>
                  ),
                  icon: <BiTrashAlt className="text-base! text-red-500" />,
                },
              ] as MenuProps["items"],
            }}
          >
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer"
              aria-label={t("detailPage.bookingRoomDetailsModal.actions.more")}
            >
              <FiMoreVertical className="text-lg text-gray-500" />
            </button>
          </Dropdown>
        ) : null,
    },
  ];

  const serviceColumns: TableProps<BookingRoomOrderService>["columns"] = [
    {
      title: t("detailPage.bookingRoomDetailsModal.table.index"),
      key: "index",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.service"),
      key: "service",
      render: (_, record) => record.service?.name || EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.quantity"),
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      render: (value?: number) =>
        typeof value === "number" ? String(value) : EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.unitPrice"),
      dataIndex: "unit_price",
      key: "unit_price",
      align: "right",
      render: (value?: number) => formatCurrency(value),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.totalPrice"),
      dataIndex: "total_price",
      key: "total_price",
      align: "right",
      render: (value?: number) => formatCurrency(value),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.estimatedAt"),
      dataIndex: "estimated_at",
      key: "estimated_at",
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.status"),
      dataIndex: "status",
      key: "status",
      render: (value?: string) => (
        <Tag
          className={`!rounded-md !border !font-medium !text-xs !px-2 !py-0 ${getStateTagClassName(
            value,
          )}`}
        >
          {formatEnumLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.guestNote"),
      dataIndex: "guest_note",
      key: "guest_note",
      render: (value?: string | null) => value || EMPTY_VALUE,
    },
  ];

  const supportColumns: TableProps<BookingRoomSupportTicket>["columns"] = [
    {
      title: t("detailPage.bookingRoomDetailsModal.table.index"),
      key: "index",
      width: 72,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.category"),
      key: "category",
      render: (_, record) => record.support_category?.name || EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.content"),
      dataIndex: "content",
      key: "content",
      render: (value?: string) => value || EMPTY_VALUE,
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.priority"),
      dataIndex: "priority",
      key: "priority",
      render: (value?: string) => (
        <Tag
          className={`!rounded-md !border !font-medium !text-xs !px-2 !py-0 ${getStateTagClassName(
            value,
          )}`}
        >
          {formatEnumLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.status"),
      dataIndex: "status",
      key: "status",
      render: (value?: string) => (
        <Tag
          className={`!rounded-md !border !font-medium !text-xs !px-2 !py-0 ${getStateTagClassName(
            value,
          )}`}
        >
          {formatEnumLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("detailPage.bookingRoomDetailsModal.table.createdAt"),
      dataIndex: "created_at",
      key: "created_at",
      render: (value?: string) => formatDateTime(value),
    },
  ];

  const tabSectionTitleMap: Record<BookingRoomDetailsTabKey, string> = {
    stay: t("detailPage.bookingRoomDetailsModal.sections.stay"),
    services: t("detailPage.bookingRoomDetailsModal.sections.services"),
    support: t("detailPage.bookingRoomDetailsModal.sections.support"),
    review: t("detailPage.bookingRoomDetailsModal.sections.review"),
  };

  const renderSectionFrame = (children: React.ReactNode) => (
    <div className="min-h-[360px] bg-white p-3 sm:p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {tabSectionTitleMap[activeTab] || tabSectionTitleMap.review}
        </h3>

        {shouldShowAddAction ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {isStayTab && canAccessStayTab ? (
              <button
                type="button"
                onClick={onStartVerification}
                disabled={!canStartVerification}
                title={
                  isCheckedInStatus
                    ? undefined
                    : t(
                        "detailPage.bookingRoomDetailsModal.actions.requiresCheckedIn",
                      )
                }
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#0a0a0a] bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <PiScanDuotone className="text-sm" />
                {verificationPending
                  ? t(
                      "detailPage.bookingRoomDetailsModal.verification.processing",
                    )
                  : t(
                      "detailPage.bookingRoomDetailsModal.actions.scanDocuments",
                    )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={isServicesTab ? onAddServiceOrder : onAddGuest}
              disabled={!canAddAction}
              title={
                isCheckedInStatus
                  ? undefined
                  : t(
                      "detailPage.bookingRoomDetailsModal.actions.requiresCheckedIn",
                    )
              }
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <BiPlus className="text-base" />
              {isServicesTab
                ? t(
                    "detailPage.bookingRoomDetailsModal.actions.createServiceOrder",
                  )
                : t("detailPage.bookingRoomDetailsModal.actions.add")}
            </button>
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );

  const tabItems: TabsProps["items"] = [];

  if (canAccessStayTab) {
    tabItems.push({
      key: "stay",
      label: t("detailPage.bookingRoomDetailsModal.tabs.stay"),
      children: renderSectionFrame(
        <Table<BookingRoomGuest>
          columns={stayColumns}
          dataSource={guests}
          pagination={false}
          locale={{ emptyText: t("detailPage.bookingRoomDetailsModal.empty") }}
          rowKey={(record, index) => record.id || `guest-${index}`}
          scroll={{ x: 1260 }}
          className="[&_.ant-table-measure-row]:hidden"
        />,
      ),
    });
  }

  if (canAccessServicesTab) {
    tabItems.push({
      key: "services",
      label: t("detailPage.bookingRoomDetailsModal.tabs.services"),
      children: renderSectionFrame(
        <Table<BookingRoomOrderService>
          columns={serviceColumns}
          dataSource={orderServices}
          pagination={false}
          locale={{ emptyText: t("detailPage.bookingRoomDetailsModal.empty") }}
          rowKey={(record, index) => record.id || `service-${index}`}
          scroll={{ x: 1080 }}
          className="[&_.ant-table-measure-row]:hidden"
        />,
      ),
    });
  }

  if (canAccessSupportTab) {
    tabItems.push({
      key: "support",
      label: t("detailPage.bookingRoomDetailsModal.tabs.support"),
      children: renderSectionFrame(
        <Table<BookingRoomSupportTicket>
          columns={supportColumns}
          dataSource={supportTickets}
          pagination={false}
          locale={{ emptyText: t("detailPage.bookingRoomDetailsModal.empty") }}
          rowKey={(record, index) => record.id || `support-${index}`}
          scroll={{ x: 1080 }}
          className="[&_.ant-table-measure-row]:hidden"
        />,
      ),
    });
  }

  tabItems.push({
    key: "review",
    label: t("detailPage.bookingRoomDetailsModal.tabs.review"),
    children: renderSectionFrame(
      review ? (
        <div className="rounded-lg border border-gray-200 bg-[#fafafa] p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {t("detailPage.bookingRoomDetailsModal.review.reviewId")}
              </p>
              <p className="text-base font-semibold text-gray-900">
                #{review.id}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-sm text-gray-500">
                {t("detailPage.bookingRoomDetailsModal.review.rating")}
              </p>
              <div className="mt-1 inline-flex items-center gap-2">
                <Rate
                  disabled
                  value={review.star || 0}
                  className="[&_.ant-rate-star]:!me-1 [&_.ant-rate-star-first]:!text-[18px] [&_.ant-rate-star-second]:!text-[18px]"
                />
                <span className="text-sm font-medium text-gray-700">
                  {review.star || 0}/5
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-gray-200 bg-white p-3">
            <p className="mb-1 text-sm text-gray-500">
              {t("detailPage.bookingRoomDetailsModal.review.content")}
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">
              {review.content || EMPTY_VALUE}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-[#fafafa] py-14">
          <Empty
            description={t("detailPage.bookingRoomDetailsModal.review.empty")}
          />
        </div>
      ),
    ),
  });

  const resolvedTabItem =
    tabItems.find((tabItem) => tabItem?.key === activeTab) || tabItems[0];

  if (!showTabNavigation) {
    return <>{resolvedTabItem?.children}</>;
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => onTabChange(key as BookingRoomDetailsTabKey)}
      items={tabItems}
      className="[&_.ant-tabs-nav]:!mb-4 [&_.ant-tabs-tab-btn]:!text-base [&_.ant-tabs-tab]:!px-0 [&_.ant-tabs-tab]:!mr-6 [&_.ant-tabs-ink-bar]:!bg-[#2563eb]"
    />
  );
}
