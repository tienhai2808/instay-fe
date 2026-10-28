"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { Dropdown, Empty } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import { FiChevronDown, FiDownload } from "react-icons/fi";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery } from "@tanstack/react-query";
import { exportCustomers, getCustomers } from "@/apis/customer";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { ExportCustomersRequest } from "@/types/request/customer";
import CustomersFilter from "./components/Filter";
import CustomersTable from "./components/Table";

type ExportOptionKey = "created_at_asc" | "created_at_desc";

const exportOptionPayloadMap: Record<
  ExportOptionKey,
  Required<Pick<ExportCustomersRequest, "sort" | "order">>
> = {
  created_at_asc: { sort: "created_at", order: "asc" },
  created_at_desc: { sort: "created_at", order: "desc" },
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

export default function CustomersPage() {
  const t = useTranslations("CustomersPage");
  const locale = useLocale();
  const messageApi = useMessage();

  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const dateTimeFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [locale]);

  const customersParams = useMemo(
    () => ({
      page,
      limit,
      sort: "created_at" as const,
      order: "desc" as const,
      search: searchValue.trim() || undefined,
    }),
    [limit, page, searchValue],
  );

  const {
    data: customersRes,
    isFetching: isCustomersFetching,
    error: customersError,
  } = useQuery({
    queryKey: queryKeys.customers.list(customersParams),
    queryFn: async () => getCustomers(customersParams),
    placeholderData: (previousData) => previousData,
  });

  const customersData = customersRes?.data?.data;
  const customers = customersData?.customers ?? [];
  const meta = customersData?.meta;
  const currentPage = meta?.page ?? page;
  const pageSize = meta?.limit ?? limit;
  const total = meta?.total ?? 0;
  const totalPages = meta?.total_pages ?? 0;
  const hasPrev = Boolean(meta?.has_prev);
  const hasNext = Boolean(meta?.has_next);
  const loading = isCustomersFetching;
  const canExport = customers.length > 0;

  useEffect(() => {
    if (customersError) {
      messageApi.errorFromApi(customersError);
    }
  }, [customersError, messageApi]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setPage((prevPage) => (prevPage === 1 ? prevPage : 1));
  };

  const exportMutation = useMutation({
    mutationFn: async (payload: ExportCustomersRequest) =>
      exportCustomers(payload),
    onSuccess: (response) => {
      const blob = response.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        messageApi.error(t("export.errors.emptyFile"));
        return;
      }

      const contentDisposition = response.headers["content-disposition"];
      const fileName =
        parseFileNameFromDisposition(contentDisposition) ||
        `customers_${dayjs().format("YYYYMMDDHHmmss")}.csv`;

      downloadBlob(blob, fileName);
    },
    onError: (error) => {
      messageApi.errorFromApi(error, t("export.errors.failed"));
    },
  });

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== limit) {
      setLimit(nextPageSize);
      setPage(1);
      return;
    }

    if (nextPage > currentPage && !hasNext) return;
    if (nextPage < currentPage && !hasPrev) return;

    setPage(nextPage);
  };

  const exportMenuItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "created_at_desc",
        label: t("export.options.createdAtDesc"),
      },
      {
        key: "created_at_asc",
        label: t("export.options.createdAtAsc"),
      },
    ],
    [t],
  );

  const handleExportMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (!isExportOptionKey(key) || exportMutation.isPending || !canExport) {
      return;
    }

    exportMutation.mutate({
      ...exportOptionPayloadMap[key],
    });
  };

  const formatCreatedAt = (value?: string) => {
    if (!value) return "-";

    const date = dayjs(value);
    if (!date.isValid()) return "-";

    return dateTimeFormatter.format(date.toDate());
  };

  const formatGender = (value?: string) => {
    const normalizedValue = value?.trim().toLowerCase();
    if (!normalizedValue) return "-";

    if (normalizedValue === "male") return t("gender.male");
    if (normalizedValue === "female") return t("gender.female");
    if (normalizedValue === "other") return t("gender.other");

    return (value ?? "")
      .replace(/[_-]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <CustomersFilter
              searchValue={searchValue}
              searchPlaceholder={t("filters.searchPlaceholder")}
              onSearchChange={handleSearchChange}
            />
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
              className="inline-flex h-[36px] items-center justify-center gap-2 self-start rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm font-medium text-[#1f2937] transition hover:border-[#8b5cf6] hover:text-[#8b5cf6] disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
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
      </div>

      {customers.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <CustomersTable
            loading={loading}
            customers={customers}
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={setSelectedRowKeys}
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPaginationChange={handlePaginationChange}
            formatCreatedAt={formatCreatedAt}
            formatGender={formatGender}
            labels={{
              id: t("table.id"),
              phone: t("table.phone"),
              birthYear: t("table.birthYear"),
              gender: t("table.gender"),
              createdAt: t("table.createdAt"),
              selectedRows: ({ selected, total }) =>
                t("pagination.selectedRows", {
                  selected,
                  total,
                }),
              pageInfo: ({ current, totalPages }) =>
                t("pagination.pageInfo", {
                  current,
                  totalPages,
                }),
            }}
          />
        </div>
      )}
    </div>
  );
}
