"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { Dropdown, Empty, Table, Tag, Tooltip } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FiMoreVertical } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrderServices,
  updateOrderServiceStatusForAdmin,
} from "@/apis/order_service";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { OrderService } from "@/types/data/order_service";
import type {
  GetOrderServicesRequest,
  OrderServiceStatus,
} from "@/types/request/order_service";
import type { OrderServicesResponseData } from "@/types/response/order_service";
import OrderServicesFilter, {
  type OrderServicesDateRange,
} from "./components/Filter";
import ConfirmOrderServiceModal from "./components/ConfirmOrderServiceModal";

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
};

const toNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
};

const normalizeOrderServicesResponse = (
  payload: OrderServicesResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const orderServices = payload?.order_services || [];
  const pagination = payload?.meta || payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);

  const estimatedTotalFromData = Math.max(
    (page - 1) * limit + orderServices.length,
    orderServices.length,
  );
  const total = totalFromApi ?? estimatedTotalFromData;
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasPrev = pagination?.has_prev ?? page > 1;
  const hasNext = pagination?.has_next ?? page < totalPages;

  return {
    orderServices,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

const resolveStatusTagColor = (value?: OrderServiceStatus) => {
  if (value === "confirmed") return "green";
  if (value === "cancelled") return "red";
  return "gold";
};

export default function OrderServicesPage() {
  const t = useTranslations("OrderServicesPage");
  const locale = useLocale();
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<OrderServiceStatus>();
  const [dateRangeValue, setDateRangeValue] =
    useState<OrderServicesDateRange>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [confirmOrderServiceId, setConfirmOrderServiceId] = useState<
    string | null
  >(null);

  const fromDate = dateRangeValue?.[0]?.format("YYYY-MM-DD");
  const toDate = dateRangeValue?.[1]?.format("YYYY-MM-DD");

  const orderServicesQueryParams = useMemo<GetOrderServicesRequest>(
    () => ({
      page,
      limit,
      sort: "estimated_at",
      order: "desc",
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      status: statusFilter,
    }),
    [fromDate, limit, page, statusFilter, toDate],
  );

  const {
    data: orderServicesRes,
    isFetching: isOrderServicesFetching,
    error: orderServicesError,
  } = useQuery({
    queryKey: queryKeys.orderServices.list(orderServicesQueryParams),
    queryFn: async () => getOrderServices(orderServicesQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (orderServicesError) {
      messageApi.errorFromApi(orderServicesError);
    }
  }, [messageApi, orderServicesError]);

  const normalized = useMemo(() => {
    return normalizeOrderServicesResponse(
      orderServicesRes?.data?.data,
      page,
      limit,
    );
  }, [limit, orderServicesRes?.data?.data, page]);

  const orderServices = normalized.orderServices;
  const loading = isOrderServicesFetching;

  const confirmMutation = useMutation({
    mutationFn: async (variables: { id: string; staff_note?: string }) =>
      updateOrderServiceStatusForAdmin(variables.id, {
        status: "confirmed",
        ...(variables.staff_note?.trim()
          ? { staff_note: variables.staff_note.trim() }
          : {}),
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setConfirmOrderServiceId(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orderServices.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

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
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateTimeFormatter.format(date);
  };

  const formatMoney = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "-";
    return currencyFormatter.format(value);
  };

  const formatBookingRoom = (record: OrderService) => {
    const bookingRoom = record.booking_room;
    if (!bookingRoom) return "-";

    const roomName = bookingRoom.room?.name?.trim();

    if (roomName) return roomName;
    return "-";
  };

  const resolveStatusLabel = (value?: OrderServiceStatus) => {
    if (value === "confirmed") return t("statuses.confirmed");
    if (value === "cancelled") return t("statuses.cancelled");
    return t("statuses.pending");
  };

  const columns: ColumnsType<OrderService> = [
    {
      title: t("table.service"),
      key: "service",
      width: 220,
      render: (_, record) => (
        <Link
          href={`/order-services/${record.id}`}
          className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
        >
          {record.service?.name || "-"}
        </Link>
      ),
    },
    {
      title: t("table.room"),
      key: "bookingRoom",
      width: 140,
      render: (_, record) => formatBookingRoom(record),
    },
    {
      title: t("table.quantity"),
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      render: (value?: number) => value ?? "-",
    },
    {
      title: t("table.totalPrice"),
      dataIndex: "total_price",
      key: "totalPrice",
      width: 160,
      render: (value?: number) => formatMoney(value),
    },
    {
      title: t("table.status"),
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value?: OrderServiceStatus) => (
        <Tag
          color={resolveStatusTagColor(value)}
          className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
        >
          {resolveStatusLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("table.estimatedAt"),
      dataIndex: "estimated_at",
      key: "estimatedAt",
      width: 220,
      render: (value?: string) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {formatDateTime(value)}
        </Tag>
      ),
    },
    {
      title: t("table.guestNote"),
      dataIndex: "guest_note",
      key: "guestNote",
      width: 280,
      render: (value?: string | null) => {
        if (!value) return "-";
        return (
          <Tooltip title={value}>
            <span className="inline-block max-w-[240px] truncate align-middle">
              {value}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 64,
      align: "right",
      render: (_, record) => {
        const menuItems: NonNullable<MenuProps["items"]> = [
          ...(record.status === "pending"
            ? [
                {
                  key: "confirm",
                  label: t("detailPage.actions.confirm"),
                  onClick: () => setConfirmOrderServiceId(record.id),
                },
              ]
            : []),
          {
            key: "view",
            label: t("actions.viewDetails"),
            onClick: () => router.push(`/order-services/${record.id}`),
          },
        ];

        return (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: menuItems,
            }}
          >
            <button
              type="button"
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 cursor-pointer"
              aria-label={t("actions.more")}
            >
              <FiMoreVertical className="text-lg text-gray-500" />
            </button>
          </Dropdown>
        );
      },
    },
  ];

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== limit) {
      setLimit(nextPageSize);
      setPage(1);
      return;
    }

    if (nextPage > normalized.page && !normalized.hasNext) return;
    if (nextPage < normalized.page && !normalized.hasPrev) return;

    setPage(nextPage);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl mb-1 font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <OrderServicesFilter
          loading={loading}
          statusValue={statusFilter}
          dateRangeValue={dateRangeValue}
          onStatusChange={(value) => {
            if (value === statusFilter) return;
            setPage(1);
            setStatusFilter(value);
          }}
          onDateRangeChange={(value) => {
            const prevFrom = dateRangeValue?.[0]?.format("YYYY-MM-DD");
            const prevTo = dateRangeValue?.[1]?.format("YYYY-MM-DD");
            const nextFrom = value?.[0]?.format("YYYY-MM-DD");
            const nextTo = value?.[1]?.format("YYYY-MM-DD");
            if (prevFrom === nextFrom && prevTo === nextTo) return;

            setPage(1);
            setDateRangeValue(value);
          }}
          labels={{
            statusPlaceholder: t("filters.status"),
            datePlaceholders: [t("filters.fromDate"), t("filters.toDate")],
            pendingLabel: t("statuses.pending"),
            confirmedLabel: t("statuses.confirmed"),
            cancelledLabel: t("statuses.cancelled"),
          }}
        />
      </div>

      {orderServices.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={orderServices}
            rowKey="id"
            scroll={{ x: 1180 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (nextSelectedRowKeys) => {
                setSelectedRowKeys(nextSelectedRowKeys);
              },
            }}
            pagination={{
              current: normalized.page,
              pageSize: normalized.limit,
              total: normalized.total,
              onChange: handlePaginationChange,
              onShowSizeChange: (_, nextSize) => {
                handlePaginationChange(1, nextSize);
              },
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              placement: ["bottomEnd"],
              showTotal: () => (
                <>
                  <span className="text-[#8c8c8c]">
                    {t("pagination.selectedRows", {
                      selected: selectedRowKeys.length,
                      total: orderServices.length,
                    })}
                  </span>
                  {" - "}
                  {t("pagination.pageInfo", {
                    current: normalized.page,
                    totalPages: normalized.totalPages,
                  })}
                </>
              ),
            }}
            className="[&_.ant-table-measure-row]:hidden  w-full [&_.ant-table-content]:!overflow-x-auto [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#d9d9d9] [&_.ant-table-container]:!rounded-sm [&_.ant-table]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!text-base [&_.ant-table-tbody>tr>td]:!h-12 [&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:!align-middle [&_.ant-pagination]:!px-3 [&_.ant-table-pagination.ant-pagination]:!justify-end [&_.ant-table-pagination.ant-pagination]:!p-0 [&_.ant-table-pagination.ant-pagination]:!mr-0 [&_.ant-pagination-total-text]:!mr-auto [&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-table-row-selected>td]:bg-white!"
          />
        </div>
      )}

      <ConfirmOrderServiceModal
        open={Boolean(confirmOrderServiceId)}
        loading={confirmMutation.isPending}
        onClose={() => setConfirmOrderServiceId(null)}
        onConfirm={({ staff_note }) => {
          if (!confirmOrderServiceId) return;
          confirmMutation.mutate({ id: confirmOrderServiceId, staff_note });
        }}
      />
    </div>
  );
}
