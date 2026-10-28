"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/routing";
import { getBasicBranches } from "@/apis/branch";
import { deleteService, deleteServices, getServices } from "@/apis/service";
import { getServiceTypes } from "@/apis/service_type";
import { queryKeys } from "@/constants/query-keys";
import { LOCALE_VI } from "@/constants/locale";
import { useMessage } from "@/providers/MessageProvider";
import type { Service } from "@/types/data/service";
import type { GetServicesRequest } from "@/types/request/service";
import type { ServicesResponseData } from "@/types/response/service";
import {
  getServiceDiscountMeta,
  getServiceDiscountedPrice,
  isServiceDiscountActive,
} from "@/utils/service-discount";
import ServicesFilter, { type ServiceStatusFilter } from "./components/Filter";
import { serviceTypesQueryKeys, servicesQueryKeys } from "./query-keys";

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

const normalizeServicesResponse = (
  payload: ServicesResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const services = payload?.services || [];
  const pagination = payload?.meta || payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + services.length, services.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    services,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

export default function ServicesPage() {
  const t = useTranslations("ServicesPage");
  const locale = useLocale();
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [serviceTypeIdFilter, setServiceTypeIdFilter] = useState<
    string | undefined
  >(undefined);
  const [branchIdFilter, setBranchIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<
    ServiceStatusFilter | undefined
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

  const openCreate = () => {
    router.push("/services/create");
  };

  const openEdit = (service: Service) => {
    router.push(`/services/${service.id}`);
  };

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const priceFormatter = useMemo(() => {
    const language = locale === LOCALE_VI ? "vi-VN" : "en-US";

    return new Intl.NumberFormat(language, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
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

  const serviceQueryParams = useMemo<GetServicesRequest>(() => {
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
      service_type_id: serviceTypeIdFilter,
      branch_id: branchIdFilter,
      is_active: isActive,
      search: appliedSearch || undefined,
    };
  }, [
    appliedSearch,
    branchIdFilter,
    limit,
    page,
    serviceTypeIdFilter,
    statusFilter,
  ]);

  const {
    data: serviceTypesRes,
    isFetching: isServiceTypesFetching,
    error: serviceTypesError,
  } = useQuery({
    queryKey: serviceTypesQueryKeys.basic(),
    queryFn: async () => getServiceTypes({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

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
    data: servicesRes,
    isFetching: isServicesFetching,
    error: servicesError,
  } = useQuery({
    queryKey: servicesQueryKeys.list(serviceQueryParams),
    queryFn: async () => getServices(serviceQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (serviceTypesError) {
      messageApi.errorFromApi(serviceTypesError);
    }
  }, [messageApi, serviceTypesError]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (servicesError) {
      messageApi.errorFromApi(servicesError);
    }
  }, [messageApi, servicesError]);

  const deleteMutation = useMutation({
    mutationFn: async (variables: { id: string } | { ids: string[] }) =>
      "id" in variables
        ? deleteService(variables.id)
        : deleteServices(variables.ids),
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
      void queryClient.invalidateQueries({ queryKey: servicesQueryKeys.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const normalized = useMemo(() => {
    return normalizeServicesResponse(servicesRes?.data?.data, page, limit);
  }, [limit, page, servicesRes?.data?.data]);

  const loading =
    isServiceTypesFetching || isBranchesFetching || isServicesFetching;
  const services = normalized.services;

  const serviceTypeOptions = useMemo(
    () =>
      (serviceTypesRes?.data?.data?.service_types || []).map((serviceType) => ({
        value: String(serviceType.id),
        label: serviceType.name || `#${serviceType.id}`,
      })),
    [serviceTypesRes?.data?.data?.service_types],
  );

  const branchOptions = useMemo(
    () =>
      (branchesRes?.data?.data?.branches || []).map((branch) => ({
        value: String(branch.id),
        label: branch.name || `#${branch.id}`,
      })),
    [branchesRes?.data?.data?.branches],
  );

  const formatCreatedDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateFormatter.format(date);
  };

  const formatPrice = (price?: number) => {
    if (typeof price !== "number" || Number.isNaN(price)) return "-";
    return priceFormatter.format(price);
  };

  const formatDiscountDateTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return dateTimeFormatter.format(date);
  };

  const formatDiscountValue = (record: Service) => {
    const discountMeta = getServiceDiscountMeta(record);
    if (!discountMeta) return "-";

    if (discountMeta.type === "percent") {
      return `${discountMeta.value}%`;
    }

    return formatPrice(discountMeta.value);
  };

  const columns: ColumnsType<Service> = [
    {
      title: t("table.serviceName"),
      key: "serviceName",
      render: (_, record) => (
        <Link
          href={`/services/${record.id}`}
          className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
        >
          {record.name || "-"}
        </Link>
      ),
    },
    {
      title: t("table.serviceType"),
      dataIndex: ["service_type", "name"],
      key: "serviceType",
      render: (value?: string) => value || "-",
    },
    {
      title: t("table.branches"),
      key: "branches",
      width: 220,
      render: (_, record) => {
        const branches = record.branches || [];

        if (!branches.length) return "-";

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
      title: t("table.price"),
      key: "price",
      width: 180,
      render: (_, record) => {
        const discountMeta = getServiceDiscountMeta(record);
        const hasDiscount = Boolean(discountMeta);
        const discountedPrice = getServiceDiscountedPrice(record.price, record);
        const discountActive = isServiceDiscountActive(record);
        const showDiscountEffect =
          discountActive &&
          typeof record.price === "number" &&
          typeof discountedPrice === "number" &&
          discountedPrice < record.price;

        return (
          <div className="min-w-[180px]">
            <Tag className="!mb-1 !border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
              {formatPrice(discountedPrice)}
            </Tag>

            {showDiscountEffect ? (
              <p className="text-xs text-gray-500 line-through">
                {formatPrice(record.price)}
              </p>
            ) : null}

            {hasDiscount ? (
              <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-gray-500">
                <p>
                  {t("table.discountType")}:{" "}
                  {discountMeta?.type === "percent"
                    ? t("form.discountTypeOptions.percent")
                    : t("form.discountTypeOptions.amount")}
                </p>
                <p>
                  {t("table.discountValue")}: {formatDiscountValue(record)}
                </p>
                <p>
                  {t("table.discountStartAt")}:{" "}
                  {formatDiscountDateTime(record.discount_start_at)}
                </p>
                <p>
                  {t("table.discountEndAt")}:{" "}
                  {formatDiscountDateTime(record.discount_end_at)}
                </p>
              </div>
            ) : null}
          </div>
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
      title: t("table.createdAt"),
      dataIndex: "created_at",
      key: "createdAt",
      width: 160,
      render: (value?: string) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {formatCreatedDate(value)}
        </Tag>
      ),
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
                      deleteMutation.mutate({ id: record.id });
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

  const handleDeleteSelectedServices = () => {
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
            onClick={
              hasSelectedRows ? handleDeleteSelectedServices : openCreate
            }
            disabled={hasSelectedRows ? deleteMutation.isPending : false}
            className={`cursor-pointer flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
              hasSelectedRows ? "w-auto" : "w-full sm:w-auto"
            } ${
              hasSelectedRows
                ? "bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#b91c1c]"
                : "bg-[#0a0a0a] hover:bg-[#3d3d3d] active:bg-[#3d3d3d]"
            }`}
          >
            {!hasSelectedRows && <FiPlus className="text-sm" />}
            {hasSelectedRows ? t("actions.deleteBatch") : t("actions.create")}
          </button>
        </div>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <ServicesFilter
          loading={loading}
          searchValue={searchValue}
          serviceTypeIdValue={serviceTypeIdFilter}
          branchIdValue={branchIdFilter}
          statusValue={statusFilter}
          serviceTypeOptions={serviceTypeOptions}
          branchOptions={branchOptions}
          onSearchChange={setSearchValue}
          onServiceTypeChange={(value) => {
            if (value === serviceTypeIdFilter) return;
            setPage(1);
            setServiceTypeIdFilter(value);
          }}
          onBranchChange={(value) => {
            if (value === branchIdFilter) return;
            setPage(1);
            setBranchIdFilter(value);
          }}
          onStatusChange={(value) => {
            if (value === statusFilter) return;
            setPage(1);
            setStatusFilter(value);
          }}
          labels={{
            searchPlaceholder: t("filters.searchPlaceholder"),
            serviceTypePlaceholder: t("filters.serviceType"),
            branchPlaceholder: t("filters.branch"),
            statusPlaceholder: t("filters.status"),
            activeLabel: t("statuses.active"),
            inactiveLabel: t("statuses.inactive"),
          }}
        />
      </div>

      {services.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={services}
            rowKey="id"
            scroll={{ x: 1240 }}
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
                      total: services.length,
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
    </div>
  );
}
