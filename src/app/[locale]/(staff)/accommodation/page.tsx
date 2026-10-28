"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiChevronDown, FiDownload, FiMoreVertical } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteGuest,
  exportGuests,
  getGuests,
  updateGuest,
} from "@/apis/guest";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { Guest } from "@/types/data/guest";
import type { ExportGuestsRequest } from "@/types/request/guest";
import type { GuestsResponseData } from "@/types/response/guest";
import AccommodationFilter, {
  type AccommodationDateRange,
} from "./components/Filter";
import AccommodationModal, {
  type AccommodationSubmitValues,
} from "./components/Modal";

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

const normalizeGuestsResponse = (
  payload: GuestsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const guests = payload?.guests || [];
  const pagination = payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + guests.length, guests.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    guests,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

type ExportOptionKey =
  | "check_in_asc"
  | "check_in_desc"
  | "check_out_asc"
  | "check_out_desc";

const exportOptionPayloadMap: Record<
  ExportOptionKey,
  Required<Pick<ExportGuestsRequest, "sort" | "order">>
> = {
  check_in_asc: { sort: "check_in", order: "asc" },
  check_in_desc: { sort: "check_in", order: "desc" },
  check_out_asc: { sort: "check_out", order: "asc" },
  check_out_desc: { sort: "check_out", order: "desc" },
};

const isExportOptionKey = (value: string): value is ExportOptionKey => {
  return value in exportOptionPayloadMap;
};

const parseFileNameFromDisposition = (contentDisposition?: string | null) => {
  if (!contentDisposition) return undefined;

  const encodedMatch = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();

  return undefined;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

export default function AccommodationPage() {
  const t = useTranslations("AccommodationPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [dateRangeValue, setDateRangeValue] =
    useState<AccommodationDateRange>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | undefined>(
    undefined,
  );

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const guestsParams = useMemo(
    () => ({
      page,
      limit,
      sort: "created_at" as const,
      order: "desc" as const,
      search: appliedSearch || undefined,
      from_date: dateRangeValue?.[0]?.format("YYYY-MM-DD") || undefined,
      to_date: dateRangeValue?.[1]?.format("YYYY-MM-DD") || undefined,
    }),
    [appliedSearch, dateRangeValue, limit, page],
  );

  const exportFilterParams = useMemo<
    Pick<ExportGuestsRequest, "from_date" | "to_date">
  >(
    () => ({
      from_date: dateRangeValue?.[0]?.format("YYYY-MM-DD") || undefined,
      to_date: dateRangeValue?.[1]?.format("YYYY-MM-DD") || undefined,
    }),
    [dateRangeValue],
  );

  const {
    data: guestsRes,
    isFetching: isGuestsFetching,
    error: guestsError,
  } = useQuery({
    queryKey: queryKeys.guests.list(guestsParams),
    queryFn: async () => getGuests(guestsParams),
    placeholderData: (previousData) => previousData,
  });

  const normalized = useMemo(() => {
    return normalizeGuestsResponse(guestsRes?.data?.data, page, limit);
  }, [guestsRes?.data?.data, limit, page]);

  const guests = normalized.guests;
  const loading = isGuestsFetching;
  const canExport = guests.length > 0;

  useEffect(() => {
    if (guestsError) {
      messageApi.errorFromApi(guestsError);
    }
  }, [guestsError, messageApi]);

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

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: AccommodationSubmitValues;
    }) => updateGuest(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setModalOpen(false);
      setSelectedGuest(undefined);
      await queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteGuest(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.guests.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async (payload: ExportGuestsRequest) => exportGuests(payload),
    onSuccess: (response) => {
      const blob = response.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        messageApi.error(t("export.errors.emptyFile"));
        return;
      }

      const contentDisposition = response.headers["content-disposition"];
      const fileName =
        parseFileNameFromDisposition(contentDisposition) ||
        `guests_${dayjs().format("YYYYMMDDHHmmss")}.csv`;

      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      messageApi.errorFromApi(error, t("export.errors.failed"));
    },
  });

  const openEdit = (guest: Guest) => {
    setSelectedGuest(guest);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGuest(undefined);
  };

  const handleSubmit = (values: AccommodationSubmitValues) => {
    if (!selectedGuest || updateMutation.isPending) return;

    updateMutation.mutate({
      id: selectedGuest.id,
      payload: values,
    });
  };

  const handleDateRangeChange = (value: AccommodationDateRange) => {
    setPage(1);
    setDateRangeValue(value);
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

  const exportMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "check_in_asc",
        label: t("export.options.checkInAsc"),
      },
      {
        key: "check_in_desc",
        label: t("export.options.checkInDesc"),
      },
      {
        key: "check_out_asc",
        label: t("export.options.checkOutAsc"),
      },
      {
        key: "check_out_desc",
        label: t("export.options.checkOutDesc"),
      },
    ],
    [t],
  );

  const handleExportMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (!isExportOptionKey(key) || exportMutation.isPending || !canExport)
      return;

    exportMutation.mutate({
      ...exportOptionPayloadMap[key],
      ...exportFilterParams,
    });
  };

  const columns: ColumnsType<Guest> = [
    {
      title: t("table.guestName"),
      key: "guestName",
      render: (_, record) => (
        <button
          type="button"
          onClick={() => openEdit(record)}
          className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
        >
          {record.full_name || `#${record.id}`}
        </button>
      ),
    },
    {
      title: t("table.dob"),
      dataIndex: "dob",
      key: "dob",
      width: 140,
      render: (value?: string) => {
        if (!value) return "-";
        const date = dayjs(value);
        if (!date.isValid()) return "-";
        return dateFormatter.format(date.toDate());
      },
    },
    {
      title: t("table.national"),
      dataIndex: "national",
      key: "national",
      width: 160,
      render: (value?: string) => value || "-",
    },
    {
      title: t("table.passport"),
      dataIndex: "passport_number",
      key: "passport_number",
      width: 240,
      render: (value?: string) => value || "-",
    },
    {
      title: t("table.checkIn"),
      dataIndex: "check_in",
      key: "check_in",
      width: 140,
      render: (value?: string) => {
        if (!value) return "-";
        const date = dayjs(value);
        if (!date.isValid()) return "-";
        return dateFormatter.format(date.toDate());
      },
    },
    {
      title: t("table.checkOut"),
      dataIndex: "check_out",
      key: "check_out",
      width: 140,
      render: (value?: string) => {
        if (!value) return "-";
        const date = dayjs(value);
        if (!date.isValid()) return "-";
        return dateFormatter.format(date.toDate());
      },
    },
    {
      title: t("table.room"),
      key: "room",
      width: 120,
      render: (_, record) => {
        return (
          record.booking_room?.room?.name ||
          record.booking_room?.code ||
          (record.booking_room?.id ? `#${record.booking_room.id}` : "-")
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 64,
      align: "right",
      render: (_, record) => (
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
                label: (
                  <Popconfirm
                    title={t("delete.title")}
                    description={t("delete.description")}
                    onConfirm={() => {
                      deleteMutation.mutate(record.id);
                    }}
                    okText={t("delete.confirm")}
                    cancelText={t("actions.cancel")}
                    okButtonProps={{ danger: true }}
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
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl mb-1 font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:flex-1">
          {t("hint.mustCreateFromBooking")}
        </div>
        <Dropdown
          trigger={["click"]}
          placement="bottomRight"
          disabled={!canExport || exportMutation.isPending}
          menu={{
            items: exportMenuItems,
            onClick: handleExportMenuClick,
          }}
        >
          <button
            type="button"
            disabled={!canExport || exportMutation.isPending}
            className="inline-flex h-[36px] items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-[#1f2937] transition hover:border-[#8b5cf6] hover:text-[#8b5cf6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiDownload className="text-base" />
            <span>
              {exportMutation.isPending
                ? t("export.exporting")
                : t("export.button")}
            </span>
            <FiChevronDown className="text-base" />
          </button>
        </Dropdown>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <AccommodationFilter
          loading={loading}
          searchValue={searchValue}
          dateRangeValue={dateRangeValue}
          searchPlaceholder={t("filters.searchPlaceholder")}
          datePlaceholder={[t("filters.fromDate"), t("filters.toDate")]}
          onSearchChange={setSearchValue}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {guests.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={guests}
            rowKey="id"
            scroll={{ x: 860 }}
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
                      total: guests.length,
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
            className="[&_.ant-table-measure-row]:hidden w-full [&_.ant-table-content]:!overflow-x-auto [&_.ant-table-container]:!border [&_.ant-table-container]:!border-[#d9d9d9] [&_.ant-table-container]:!rounded-sm [&_.ant-table]:!rounded-sm [&_.ant-table-thead>tr>th]:!h-12 [&_.ant-table-thead>tr>th]:!py-0 [&_.ant-table-thead>tr>th]:!align-middle [&_.ant-table-thead>tr>th]:!text-base [&_.ant-table-tbody>tr>td]:!h-12 [&_.ant-table-tbody>tr>td]:!py-0 [&_.ant-table-tbody>tr>td]:!align-middle [&_.ant-pagination]:!px-3 [&_.ant-table-pagination.ant-pagination]:!justify-end [&_.ant-table-pagination.ant-pagination]:!p-0 [&_.ant-table-pagination.ant-pagination]:!mr-0 [&_.ant-pagination-total-text]:!mr-auto [&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-table-row-selected>td]:bg-white!"
          />
        </div>
      )}

      <AccommodationModal
        open={modalOpen}
        guest={selectedGuest}
        submitting={updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
