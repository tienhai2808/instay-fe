"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { Dropdown, Empty, Table, Tag, Tooltip } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import { FiMoreVertical } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminChatAvailability } from "@/apis/chat";
import {
  getSupportTickets,
  updateSupportTicketStatusForAdmin,
} from "@/apis/support_ticket";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SupportTicket } from "@/types/data/support_ticket";
import type {
  GetSupportTicketsRequest,
  SupportTicketAdminUpdateStatus,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types/request/support_ticket";
import type { SupportTicketsResponseData } from "@/types/response/support_ticket";
import SupportTicketsFilter, {
  type SupportTicketsDateRange,
} from "./components/Filter";
import SupportTicketDetailModal from "./components/Modal";

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

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }
  return "";
};

const normalizeSupportTicketsResponse = (
  payload: SupportTicketsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const supportTickets = payload?.support_tickets || [];
  const pagination = payload?.meta || payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);

  const estimatedTotalFromData = Math.max(
    (page - 1) * limit + supportTickets.length,
    supportTickets.length,
  );
  const total = totalFromApi ?? estimatedTotalFromData;
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasPrev = pagination?.has_prev ?? page > 1;
  const hasNext = pagination?.has_next ?? page < totalPages;

  return {
    supportTickets,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

const resolvePriorityTagColor = (value?: SupportTicketPriority) => {
  if (value === "urgent") return "red";
  if (value === "high") return "volcano";
  if (value === "medium") return "blue";
  return "default";
};

const resolveStatusTagColor = (value?: SupportTicketStatus) => {
  if (value === "accepted") return "blue";
  if (value === "cancelled") return "red";
  if (value === "done") return "green";
  return "gold";
};

export default function SupportTicketsPage() {
  const t = useTranslations("SupportTicketsPage");
  const locale = useLocale();
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus>();
  const [priorityFilter, setPriorityFilter] = useState<SupportTicketPriority>();
  const [dateRangeValue, setDateRangeValue] =
    useState<SupportTicketsDateRange>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [selectedSupportTicket, setSelectedSupportTicket] =
    useState<SupportTicket | null>(null);
  const [openingTicketChatId, setOpeningTicketChatId] = useState<string | null>(
    null,
  );

  const currentRole = toTrimmedString(user?.role).toLowerCase();
  const canOpenChat = currentRole !== "admin";

  const fromDate = dateRangeValue?.[0]?.format("YYYY-MM-DD");
  const toDate = dateRangeValue?.[1]?.format("YYYY-MM-DD");

  const supportTicketsQueryParams = useMemo<GetSupportTicketsRequest>(
    () => ({
      page,
      limit,
      sort: "created_at",
      order: "desc",
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      status: statusFilter,
      priority: priorityFilter,
    }),
    [fromDate, limit, page, priorityFilter, statusFilter, toDate],
  );

  const {
    data: supportTicketsRes,
    isFetching: isSupportTicketsFetching,
    error: supportTicketsError,
  } = useQuery({
    queryKey: queryKeys.supportTickets.list(supportTicketsQueryParams),
    queryFn: async () => getSupportTickets(supportTicketsQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (supportTicketsError) {
      messageApi.errorFromApi(supportTicketsError);
    }
  }, [messageApi, supportTicketsError]);

  const normalized = useMemo(() => {
    return normalizeSupportTicketsResponse(
      supportTicketsRes?.data?.data,
      page,
      limit,
    );
  }, [limit, page, supportTicketsRes?.data?.data]);

  const supportTickets = normalized.supportTickets;
  const loading = isSupportTicketsFetching;

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      status: SupportTicketAdminUpdateStatus;
    }) =>
      updateSupportTicketStatusForAdmin(variables.id, {
        status: variables.status,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setSelectedSupportTicket(null);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.supportTickets.all,
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

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateTimeFormatter.format(date);
  };

  const formatRoomName = (record: SupportTicket) => {
    const roomName = record.booking_room?.room?.name?.trim();
    return roomName || "-";
  };

  const resolveStatusLabel = (value?: SupportTicketStatus) => {
    if (value === "accepted") return t("statuses.accepted");
    if (value === "cancelled") return t("statuses.cancelled");
    if (value === "done") return t("statuses.done");
    return t("statuses.pending");
  };

  const resolvePriorityLabel = (value?: SupportTicketPriority) => {
    if (value === "urgent") return t("priorities.urgent");
    if (value === "high") return t("priorities.high");
    if (value === "medium") return t("priorities.medium");
    return t("priorities.low");
  };

  const columns: ColumnsType<SupportTicket> = [
    {
      title: t("table.requestType"),
      key: "requestType",
      width: 180,
      render: (_, record) => (
        <button
          type="button"
          onClick={() => setSelectedSupportTicket(record)}
          className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
        >
          {record.support_category?.name || "-"}
        </button>
      ),
    },
    {
      title: t("table.room"),
      key: "room",
      width: 120,
      render: (_, record) => formatRoomName(record),
    },
    {
      title: t("table.priority"),
      dataIndex: "priority",
      key: "priority",
      width: 140,
      render: (value?: SupportTicketPriority) => (
        <Tag
          color={resolvePriorityTagColor(value)}
          className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
        >
          {resolvePriorityLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("table.status"),
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (value?: SupportTicketStatus) => (
        <Tag
          color={resolveStatusTagColor(value)}
          className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
        >
          {resolveStatusLabel(value)}
        </Tag>
      ),
    },
    {
      title: t("table.content"),
      dataIndex: "content",
      key: "content",
      width: 320,
      render: (value?: string) => {
        if (!value) return "-";

        return (
          <Tooltip title={value}>
            <span className="inline-block max-w-[280px] truncate align-middle">
              {value}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: t("table.createdAt"),
      dataIndex: "created_at",
      key: "createdAt",
      width: 220,
      render: (value?: string) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {formatDateTime(value)}
        </Tag>
      ),
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
                  label: t("modal.actions.confirm"),
                  disabled: updateStatusMutation.isPending,
                  onClick: () =>
                    updateStatusMutation.mutate({
                      id: record.id,
                      status: "accepted",
                    }),
                },
              ]
            : []),
          ...(record.status === "accepted"
            ? [
                {
                  key: "complete",
                  label: t("modal.actions.complete"),
                  disabled: updateStatusMutation.isPending,
                  onClick: () =>
                    updateStatusMutation.mutate({
                      id: record.id,
                      status: "done",
                    }),
                },
              ]
            : []),
          {
            key: "view",
            label: t("actions.viewDetails"),
            onClick: () => setSelectedSupportTicket(record),
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

  const handleOpenSupportTicketChat = async (
    supportTicket: SupportTicket | null,
  ) => {
    if (!supportTicket?.id || !canOpenChat) return;

    const bookingRoomId = toTrimmedString(supportTicket.booking_room?.id);
    if (!bookingRoomId) {
      messageApi.error(t("chatErrors.missingBookingRoom"));
      return;
    }

    setOpeningTicketChatId(supportTicket.id);

    try {
      const availabilityRes = await getAdminChatAvailability({
        booking_room_id: bookingRoomId,
      });
      const availability = availabilityRes?.data?.data;
      const chatId = toTrimmedString(availability?.chat_id);
      const hasExistingChat = Boolean(availability?.available && chatId);

      if (hasExistingChat) {
        router.push(`/chats/${encodeURIComponent(chatId)}`);
        return;
      }

      router.push(
        `/chats/preview?booking_room_id=${encodeURIComponent(bookingRoomId)}`,
      );
    } catch (error) {
      messageApi.errorFromApi(error, t("chatErrors.unavailable"));
    } finally {
      setOpeningTicketChatId(null);
    }
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
        <SupportTicketsFilter
          loading={loading}
          statusValue={statusFilter}
          priorityValue={priorityFilter}
          dateRangeValue={dateRangeValue}
          onStatusChange={(value) => {
            if (value === statusFilter) return;
            setPage(1);
            setStatusFilter(value);
          }}
          onPriorityChange={(value) => {
            if (value === priorityFilter) return;
            setPage(1);
            setPriorityFilter(value);
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
            priorityPlaceholder: t("filters.priority"),
            datePlaceholders: [t("filters.fromDate"), t("filters.toDate")],
            pendingLabel: t("statuses.pending"),
            acceptedLabel: t("statuses.accepted"),
            cancelledLabel: t("statuses.cancelled"),
            doneLabel: t("statuses.done"),
            lowLabel: t("priorities.low"),
            mediumLabel: t("priorities.medium"),
            highLabel: t("priorities.high"),
            urgentLabel: t("priorities.urgent"),
          }}
        />
      </div>

      {supportTickets.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={supportTickets}
            rowKey="id"
            scroll={{ x: 1220 }}
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
                      total: supportTickets.length,
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

      <SupportTicketDetailModal
        open={Boolean(selectedSupportTicket)}
        loading={updateStatusMutation.isPending}
        chatLoading={
          Boolean(selectedSupportTicket?.id) &&
          openingTicketChatId === selectedSupportTicket?.id
        }
        showChatAction={canOpenChat}
        supportTicket={selectedSupportTicket}
        onClose={() => setSelectedSupportTicket(null)}
        onOpenChat={() => {
          void handleOpenSupportTicketChat(selectedSupportTicket);
        }}
        onUpdateStatus={(nextStatus) => {
          if (!selectedSupportTicket?.id) return;
          updateStatusMutation.mutate({
            id: selectedSupportTicket.id,
            status: nextStatus,
          });
        }}
      />
    </div>
  );
}
