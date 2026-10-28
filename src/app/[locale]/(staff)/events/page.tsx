"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBasicBranches } from "@/apis/branch";
import { deleteEvent, deleteEvents, getEvents } from "@/apis/event";
import { queryKeys } from "@/constants/query-keys";
import { LOCALE_VI } from "@/constants/locale";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Event } from "@/types/data/event";
import type { GetEventsRequest } from "@/types/request/event";
import type { EventsResponseData } from "@/types/response/event";
import { resolvePublicImageUrl } from "@/utils/media";
import EventFilter, { type EventStatusFilter } from "./components/EventFilter";
import { eventQueryKeys } from "./event-query-keys";

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

const normalizeEventsResponse = (
  payload: EventsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const events = payload?.events || [];
  const pagination = payload?.meta;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + events.length, events.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    events,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

export default function EventsPage() {
  const t = useTranslations("EventsPage");
  const locale = useLocale();
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [branchIdFilter, setBranchIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<
    EventStatusFilter | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const selectedIds = useMemo(
    () =>
      Array.from(
        new Set(selectedRowKeys.map((key) => String(key)).filter(Boolean)),
      ),
    [selectedRowKeys],
  );
  const hasSelectedRows = selectedIds.length > 0;
  const scopedBranchIds = useMemo(
    () => (user?.branches || []).map((branch) => String(branch.id)),
    [user?.branches],
  );
  const isScopedUser = scopedBranchIds.length > 0;

  const openCreate = () => {
    router.push("/events/create");
  };

  const openEdit = (event: Event) => {
    router.push(`/events/${event.id}`);
  };

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const dateTimeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [locale]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextAppliedSearch = searchValue.trim();
      setPage((prevPage) => (prevPage === 1 ? prevPage : 1));
      setAppliedSearch((prevSearch) =>
        prevSearch === nextAppliedSearch ? prevSearch : nextAppliedSearch,
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue]);

  const eventQueryParams = useMemo<GetEventsRequest>(() => {
    const isActive =
      statusFilter === "active"
        ? true
        : statusFilter === "inactive"
          ? false
          : undefined;

    return {
      page,
      limit,
      sort: "created_at",
      order: "desc",
      is_active: isActive,
      branch_id: branchIdFilter,
      search: appliedSearch || undefined,
    };
  }, [appliedSearch, branchIdFilter, limit, page, statusFilter]);

  const {
    data: branchesRes,
    isFetching: isBranchesFetching,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: getBasicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: eventsRes,
    isFetching: isEventsFetching,
    error: eventsError,
  } = useQuery({
    queryKey: eventQueryKeys.list(eventQueryParams),
    queryFn: async () => getEvents(eventQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (eventsError) {
      messageApi.errorFromApi(eventsError);
    }
  }, [eventsError, messageApi]);

  const deleteMutation = useMutation({
    mutationFn: async (variables: { id: string } | { ids: string[] }) =>
      "id" in variables
        ? deleteEvent(variables.id)
        : deleteEvents(variables.ids),
    onSuccess: (res, variables) => {
      messageApi.fromApi(res.data, "success");
      setSelectedRowKeys((prevSelectedRowKeys) => {
        if ("id" in variables) {
          return prevSelectedRowKeys.filter(
            (rowKey) => String(rowKey) !== variables.id,
          );
        }

        const deletedIds = new Set(variables.ids.map((id) => String(id)));
        return prevSelectedRowKeys.filter(
          (rowKey) => !deletedIds.has(String(rowKey)),
        );
      });
      void queryClient.invalidateQueries({ queryKey: eventQueryKeys.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const normalized = useMemo(() => {
    return normalizeEventsResponse(eventsRes?.data?.data, page, limit);
  }, [eventsRes?.data?.data, limit, page]);

  const loading = isEventsFetching || isBranchesFetching;
  const events = normalized.events;
  const branchOptions = useMemo(() => {
    const options = (branchesRes?.data?.data?.branches || []).map((branch) => ({
      value: String(branch.id),
      label: branch.name || `#${branch.id}`,
    }));

    if (!isScopedUser) return options;

    const scopedBranchIdSet = new Set(scopedBranchIds);
    return options.filter((option) => scopedBranchIdSet.has(option.value));
  }, [branchesRes?.data?.data?.branches, isScopedUser, scopedBranchIds]);

  const isGlobalEvent = (event: Event) => !(event.branches || []).length;
  const canManageEvent = (event: Event) =>
    !isScopedUser || !isGlobalEvent(event);

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateFormatter.format(date);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateTimeFormatter.format(date);
  };

  const columns: ColumnsType<Event> = [
    {
      title: t("table.title"),
      key: "title",
      render: (_, record) => {
        const thumbnailUrl = resolvePublicImageUrl(record.thumbnail);

        return (
          <Link
            href={`/events/${record.id}`}
            className="flex min-w-0 items-center gap-3 cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={record.title || t("table.title")}
                  width={48}
                  height={48}
                  sizes="48px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                  IMG
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-[#111827]">
                {record.title || "-"}
              </p>
              {record.slug ? (
                <p className="truncate text-xs text-[#6b7280]">{record.slug}</p>
              ) : null}
            </div>
          </Link>
        );
      },
    },
    {
      title: t("table.status"),
      dataIndex: "is_active",
      key: "status",
      width: 160,
      render: (value?: boolean) => {
        const isActive = Boolean(value);
        return (
          <Tag
            color={isActive ? "green" : "red"}
            className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
          >
            {isActive ? t("statuses.active") : t("statuses.inactive")}
          </Tag>
        );
      },
    },
    {
      title: t("table.branches"),
      key: "branches",
      width: 220,
      render: (_, record) => {
        const branches = record.branches || [];

        if (!branches.length) {
          return (
            <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
              {t("form.allBranches")}
            </Tag>
          );
        }

        return (
          <div className="flex max-w-[220px] flex-wrap gap-1">
            {branches.map((branch) => (
              <Tag
                key={branch.id}
                className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
              >
                {branch.name || `#${branch.id}`}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: t("table.publishedAt"),
      dataIndex: "published_at",
      key: "publishedAt",
      width: 180,
      render: (value?: string | null) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {value ? formatDateTime(value) : t("statuses.unpublished")}
        </Tag>
      ),
    },
    {
      title: t("table.createdAt"),
      dataIndex: "created_at",
      key: "createdAt",
      width: 160,
      render: (value?: string) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {formatDate(value)}
        </Tag>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 64,
      align: "right",
      render: (_, record) => {
        const isManageable = canManageEvent(record);

        return (
          <Dropdown
            trigger={["click"]}
            placement="bottomRight"
            menu={{
              items: [
                {
                  key: "edit",
                  label: t("actions.edit"),
                  onClick: () => openEdit(record),
                  icon: <BiEditAlt className="text-base! text-blue-500" />,
                },
                {
                  key: "delete",
                  disabled: !isManageable,
                  label: (
                    <Popconfirm
                      title={t("delete.title")}
                      description={t("delete.description")}
                      onConfirm={() => {
                        if (!isManageable) return;
                        deleteMutation.mutate({ id: record.id });
                      }}
                      okText={t("delete.confirm")}
                      cancelText={t("actions.cancel")}
                      okButtonProps={{ danger: true }}
                      disabled={!isManageable}
                    >
                      <span>{t("actions.delete")}</span>
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
              aria-label={t("actions.more")}
            >
              <FiMoreVertical className="text-lg text-gray-500" />
            </button>
          </Dropdown>
        );
      },
    },
  ];

  const handleBranchChange = (value?: string) => {
    if (value === branchIdFilter) return;
    setPage(1);
    setBranchIdFilter(value);
  };

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

  const handleDeleteSelectedEvents = () => {
    if (!hasSelectedRows || deleteMutation.isPending) return;
    deleteMutation.mutate({ ids: selectedIds });
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl mb-1 font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {hasSelectedRows ? (
            <p className="text-xs text-[#8c8c8c]">
              {t("selection.selected", { count: selectedIds.length })}
            </p>
          ) : null}
          <button
            onClick={hasSelectedRows ? handleDeleteSelectedEvents : openCreate}
            disabled={hasSelectedRows ? deleteMutation.isPending : false}
            className={`cursor-pointer flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
              hasSelectedRows ? "w-auto" : "w-full sm:w-auto"
            } ${
              hasSelectedRows
                ? "bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#b91c1c]"
                : "bg-[#0a0a0a] hover:bg-[#3d3d3d] active:bg-[#3d3d3d]"
            }`}
          >
            {!hasSelectedRows ? <FiPlus className="text-sm" /> : null}
            {hasSelectedRows ? t("actions.deleteBatch") : t("actions.create")}
          </button>
        </div>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <EventFilter
          loading={loading}
          searchValue={searchValue}
          branchIdValue={branchIdFilter}
          statusValue={statusFilter}
          branchOptions={branchOptions}
          onSearchChange={setSearchValue}
          onBranchChange={handleBranchChange}
          onStatusChange={(value) => {
            if (value === statusFilter) return;
            setPage(1);
            setStatusFilter(value);
          }}
          labels={{
            searchPlaceholder: t("filters.searchPlaceholder"),
            branchPlaceholder: t("filters.branch"),
            statusPlaceholder: t("filters.status"),
            activeLabel: t("statuses.active"),
            inactiveLabel: t("statuses.inactive"),
          }}
        />
      </div>

      {events.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={events}
            rowKey="id"
            scroll={{ x: 1200 }}
            rowSelection={{
              selectedRowKeys,
              getCheckboxProps: (record) => ({
                disabled: !canManageEvent(record),
              }),
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
                      total: events.length,
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
            className="[&_.ant-table-measure-row]:hidden  w-full [&_.ant-table-content]:!overflow-x-auto [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#d9d9d9] [&_.ant-table-container]:!rounded-sm [&_.ant-table]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!text-base [&_.ant-table-tbody>tr>td]:!h-16 [&_.ant-table-tbody>tr>td]:!py-2 [&_.ant-table-tbody>tr>td]:!align-middle [&_.ant-pagination]:!px-3 [&_.ant-table-pagination.ant-pagination]:!justify-end [&_.ant-table-pagination.ant-pagination]:!p-0 [&_.ant-table-pagination.ant-pagination]:!mr-0 [&_.ant-pagination-total-text]:!mr-auto [&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-table-row-selected>td]:bg-white!"
          />
        </div>
      )}
    </div>
  );
}
