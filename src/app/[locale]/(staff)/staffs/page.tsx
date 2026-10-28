"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { User } from "@/types/data/user";
import { UserRole } from "@/types/request/user";
import { UsersResponseData } from "@/types/response/user";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { getBasicBranches } from "@/apis/branch";
import { deleteUser, deleteUsers, getUsers } from "@/apis/user";
import { getDepartments } from "@/apis/department";
import StaffFilter from "./components/Filter";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";

type StaffStatusFilter = "active" | "inactive";

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

const normalizeUsersResponse = (
  payload: UsersResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const users = payload?.users || [];
  const pagination = payload?.meta || payload?.pagination;

  const page =
    toPositiveNumber(pagination?.page) ??
    toPositiveNumber(payload?.pagination?.page) ??
    fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + users.length, users.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    users,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

export default function StaffsPage() {
  const t = useTranslations("StaffsPage");
  const locale = useLocale();
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(undefined);
  const [departmentIdFilter, setDepartmentIdFilter] = useState<
    string | undefined
  >(undefined);
  const [branchIdFilter, setBranchIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<
    StaffStatusFilter | undefined
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
    router.push("/staffs/create");
  };

  const openEdit = (staff: User) => {
    router.push(`/staffs/${staff.id}`);
  };

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const usersQueryParams = useMemo(() => {
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
      order: "desc" as const,
      role: roleFilter,
      department_id: departmentIdFilter,
      branch_id: branchIdFilter,
      is_active: isActive,
      search: appliedSearch || undefined,
    };
  }, [
    appliedSearch,
    branchIdFilter,
    departmentIdFilter,
    limit,
    page,
    roleFilter,
    statusFilter,
  ]);

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
    data: branchesRes,
    isFetching: isBranchesFetching,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: getBasicBranches,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: usersRes,
    isFetching: isUsersFetching,
    error: usersError,
  } = useQuery({
    queryKey: queryKeys.users.list(usersQueryParams),
    queryFn: async () => getUsers(usersQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (departmentsError) {
      messageApi.errorFromApi(departmentsError);
    }
  }, [departmentsError, messageApi]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (usersError) {
      messageApi.errorFromApi(usersError);
    }
  }, [messageApi, usersError]);

  const deleteMutation = useMutation({
    mutationFn: async (variables: { id: string } | { ids: string[] }) =>
      "id" in variables ? deleteUser(variables.id) : deleteUsers(variables.ids),
    onSuccess: async (res, variables) => {
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const normalized = useMemo(() => {
    return normalizeUsersResponse(usersRes?.data?.data, page, limit);
  }, [limit, page, usersRes?.data?.data]);

  const staffs = normalized.users;
  const loading =
    isDepartmentsFetching || isBranchesFetching || isUsersFetching;

  const departmentOptions = useMemo(
    () =>
      (departmentsRes?.data?.data?.departments || []).map((department) => ({
        value: String(department.id),
        label: department.name || `#${department.id}`,
      })),
    [departmentsRes?.data?.data?.departments],
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

  const handleDelete = (staff: User) => {
    deleteMutation.mutate({ id: staff.id });
  };

  const handleDeleteSelectedStaffs = () => {
    if (!hasSelectedRows || deleteMutation.isPending) return;
    deleteMutation.mutate({ ids: selectedIds });
  };

  const columns: ColumnsType<User> = [
    {
      title: t("table.staffName"),
      key: "staffName",
      render: (_, record) => {
        const fullName =
          `${record.first_name || ""} ${record.last_name || ""}`.trim();
        return (
          <Link
            href={`/staffs/${record.id}`}
            className="cursor-pointer bg-transparent border-0 p-0 text-left text-black!"
          >
            {fullName || record.username || record.email || "-"}
          </Link>
        );
      },
    },
    {
      title: t("table.role"),
      dataIndex: "role",
      key: "role",
      width: 140,
      render: (value?: string) => {
        const label =
          value === "admin"
            ? t("roles.admin")
            : value === "staff"
              ? t("roles.staff")
              : value || "-";
        return label;
      },
    },
    {
      title: t("table.department"),
      key: "department",
      dataIndex: ["department", "name"],
      render: (value?: string) => value || "-",
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
                      handleDelete(record);
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

  const handleRoleChange = (value?: UserRole) => {
    if (value === roleFilter) return;
    setPage(1);
    setRoleFilter(value);
  };

  const handleDepartmentChange = (value?: string) => {
    if (value === departmentIdFilter) return;
    setPage(1);
    setDepartmentIdFilter(value);
  };

  const handleBranchChange = (value?: string) => {
    if (value === branchIdFilter) return;
    setPage(1);
    setBranchIdFilter(value);
  };

  const handleStatusChange = (value?: StaffStatusFilter) => {
    if (value === statusFilter) return;
    setPage(1);
    setStatusFilter(value);
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
            onClick={hasSelectedRows ? handleDeleteSelectedStaffs : openCreate}
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
        <StaffFilter
          loading={loading}
          searchValue={searchValue}
          roleValue={roleFilter}
          departmentIdValue={departmentIdFilter}
          branchIdValue={branchIdFilter}
          statusValue={statusFilter}
          departmentOptions={departmentOptions}
          branchOptions={branchOptions}
          onSearchChange={setSearchValue}
          onRoleChange={handleRoleChange}
          onDepartmentChange={handleDepartmentChange}
          onBranchChange={handleBranchChange}
          onStatusChange={handleStatusChange}
          labels={{
            searchPlaceholder: t("filters.searchPlaceholder"),
            rolePlaceholder: t("filters.role"),
            departmentPlaceholder: t("filters.department"),
            branchPlaceholder: t("filters.branch"),
            statusPlaceholder: t("filters.status"),
            activeLabel: t("statuses.active"),
            inactiveLabel: t("statuses.inactive"),
            adminLabel: t("roles.admin"),
            staffLabel: t("roles.staff"),
          }}
        />
      </div>

      {staffs.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={staffs}
            rowKey="id"
            scroll={{ x: 1200 }}
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
                      total: staffs.length,
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
