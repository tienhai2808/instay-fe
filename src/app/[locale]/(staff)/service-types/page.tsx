"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import {
  createServiceType,
  deleteServiceType,
  getServiceTypes,
  updateServiceType,
} from "@/apis/service_type";
import { getDepartments } from "@/apis/department";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import { ServiceType } from "@/types/data/service_type";
import { ServiceTypesResponseData } from "@/types/response/service_type";
import ServiceTypesFilter from "./components/Filter";
import ServiceTypeModal, { ServiceTypeFormValues } from "./components/Modal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface SelectOption {
  value: string;
  label: string;
}

type ModalMode = "create" | "edit";

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

const normalizeServiceTypesResponse = (
  payload: ServiceTypesResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const serviceTypes = payload?.service_types || [];
  const pagination = payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + serviceTypes.length, serviceTypes.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    serviceTypes,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

export default function ServiceTypesPage() {
  const t = useTranslations("ServiceTypesPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [departmentIdFilter, setDepartmentIdFilter] = useState<
    string | undefined
  >(undefined);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedServiceType, setSelectedServiceType] = useState<
    ServiceType | undefined
  >(undefined);

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const numberFormatter = useMemo(() => {
    return new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US");
  }, [locale]);

  const serviceTypesParams = useMemo(
    () => ({
      page,
      limit,
      sort: "created_at" as const,
      order: "desc" as const,
      department_id: departmentIdFilter,
      search: appliedSearch || undefined,
    }),
    [appliedSearch, departmentIdFilter, limit, page],
  );

  const {
    data: departmentsRes,
    isFetching: isDepartmentsFetching,
    error: departmentsError,
  } = useQuery({
    queryKey: queryKeys.departments.basic(),
    queryFn: async () => getDepartments({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: serviceTypesRes,
    isFetching: isServiceTypesFetching,
    error: serviceTypesError,
  } = useQuery({
    queryKey: queryKeys.serviceTypes.list(serviceTypesParams),
    queryFn: async () => getServiceTypes(serviceTypesParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (departmentsError) {
      messageApi.errorFromApi(departmentsError);
    }
  }, [departmentsError, messageApi]);

  useEffect(() => {
    if (serviceTypesError) {
      messageApi.errorFromApi(serviceTypesError);
    }
  }, [messageApi, serviceTypesError]);

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

  const normalized = useMemo(() => {
    return normalizeServiceTypesResponse(
      serviceTypesRes?.data?.data,
      page,
      limit,
    );
  }, [limit, page, serviceTypesRes?.data?.data]);

  const loading = isDepartmentsFetching || isServiceTypesFetching;
  const serviceTypes = normalized.serviceTypes;

  const departmentOptions = useMemo<SelectOption[]>(
    () =>
      (departmentsRes?.data?.data?.departments || []).map((department) => ({
        value: department.id,
        label: department.name || `#${department.id}`,
      })),
    [departmentsRes?.data?.data?.departments],
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteServiceType(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ServiceTypeFormValues) =>
      createServiceType(values),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      values: ServiceTypeFormValues;
    }) => updateServiceType(variables.id, variables.values),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.serviceTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const openCreate = () => {
    setSelectedServiceType(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (serviceType: ServiceType) => {
    setSelectedServiceType(serviceType);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedServiceType(undefined);
  };

  const handleSubmit = (values: ServiceTypeFormValues) => {
    if (createMutation.isPending || updateMutation.isPending) return;

    if (modalMode === "create") {
      createMutation.mutate(values);
      return;
    }

    if (selectedServiceType) {
      updateMutation.mutate({ id: selectedServiceType.id, values });
    }
  };

  const handleDepartmentChange = (value?: string) => {
    if (value === departmentIdFilter) return;
    setPage(1);
    setDepartmentIdFilter(value);
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

  const columns: ColumnsType<ServiceType> = [
    {
      title: t("table.name"),
      key: "name",
      render: (_, record) => (
        <button
          type="button"
          onClick={() => openEdit(record)}
          className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
        >
          {record.name || `#${record.id}`}
        </button>
      ),
    },
    {
      title: t("table.department"),
      key: "department",
      dataIndex: ["department", "name"],
      render: (value?: string) => value || "-",
    },
    {
      title: t("table.serviceCount"),
      key: "serviceCount",
      dataIndex: "service_count",
      width: 250,
      render: (value?: number) => {
        const count = toNonNegativeNumber(value) ?? 0;
        return numberFormatter.format(count);
      },
    },
    {
      title: t("table.createdAt"),
      dataIndex: "created_at",
      key: "createdAt",
      width: 160,
      render: (value?: string) => (
        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
          {value ? dateFormatter.format(new Date(value)) : "-"}
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
        <button
          onClick={openCreate}
          className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] sm:w-auto"
        >
          <FiPlus className="text-sm" />
          {t("actions.create")}
        </button>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <ServiceTypesFilter
          loading={loading}
          searchValue={searchValue}
          departmentIdValue={departmentIdFilter}
          departmentOptions={departmentOptions}
          onSearchChange={setSearchValue}
          onDepartmentChange={handleDepartmentChange}
          labels={{
            searchPlaceholder: t("filters.searchPlaceholder"),
            departmentPlaceholder: t("filters.department"),
          }}
        />
      </div>

      {serviceTypes.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={serviceTypes}
            rowKey="id"
            childrenColumnName="__children"
            scroll={{ x: 900 }}
            rowSelection={{
              selectedRowKeys,
              onChange: (nextSelectedRowKeys) => {
                setSelectedRowKeys(nextSelectedRowKeys);
              },
              columnWidth: 48,
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
                      total: serviceTypes.length,
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

      <ServiceTypeModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        serviceType={selectedServiceType}
        departmentOptions={departmentOptions}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
