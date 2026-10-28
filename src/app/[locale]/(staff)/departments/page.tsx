"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Empty, Spin } from "antd";
import { FiPlus } from "react-icons/fi";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentPermission,
} from "@/apis/department";
import DepartmentModal from "./components/Modal";
import { Department, Permission } from "@/types/data/department";
import { useMessage } from "@/providers/MessageProvider";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { isCustomerServiceDepartmentName } from "@/constants/department";
import StaffSearchInput from "@/components/staff/ui/SearchInput";
import DepartmentCard from "./components/Card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ModalMode = "create" | "edit";

interface DepartmentFormValues {
  name: string;
  phone?: string;
  description: string;
  permissionIds: string[];
}

const normalizePermissions = (
  payload: { permissions?: Permission[] } | Permission[] | null | undefined,
): Permission[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.permissions || [];
};

export default function DepartmentPage() {
  const t = useTranslations("DepartmentPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedDepartment, setSelectedDepartment] = useState<
    Department | undefined
  >(undefined);

  const getPermissionLabel = useCallback(
    (permission: Permission) => {
      const localizedName =
        locale === LOCALE_VI
          ? permission.display_name_vi
          : permission.display_name_en;

      return localizedName || permission.name;
    },
    [locale],
  );

  const departmentsParams = useMemo(
    () => ({ search: appliedSearch || undefined }),
    [appliedSearch],
  );

  const {
    data: departmentsRes,
    isFetching: isDepartmentsFetching,
    error: departmentsError,
  } = useQuery({
    queryKey: queryKeys.departments.list(departmentsParams),
    queryFn: async () => getDepartments(departmentsParams),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: permissionsRes,
    isFetching: isPermissionsFetching,
    error: permissionsError,
  } = useQuery({
    queryKey: queryKeys.departments.permissions(),
    queryFn: async () => getDepartmentPermission(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (departmentsError) {
      messageApi.errorFromApi(departmentsError);
    }
  }, [departmentsError, messageApi]);

  useEffect(() => {
    if (permissionsError) {
      messageApi.errorFromApi(permissionsError);
    }
  }, [messageApi, permissionsError]);

  const departments = departmentsRes?.data?.data?.departments || [];
  const permissions = useMemo(
    () => normalizePermissions(permissionsRes?.data?.data),
    [permissionsRes?.data?.data],
  );

  const createMutation = useMutation({
    mutationFn: async (data: DepartmentFormValues) =>
      createDepartment({
        name: data.name,
        phone: data.phone || "",
        description: data.description,
        permission_ids: data.permissionIds,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
      });
    },
    onError: (mutationError) => {
      messageApi.errorFromApi(mutationError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: { id: string; data: DepartmentFormValues }) =>
      updateDepartment(variables.id, {
        name: variables.data.name,
        ...(variables.data.phone ? { phone: variables.data.phone } : {}),
        description: variables.data.description,
        permission_ids: variables.data.permissionIds,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
      });
    },
    onError: (mutationError) => {
      messageApi.errorFromApi(mutationError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDepartment(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.departments.all,
      });
    },
    onError: (mutationError) => {
      messageApi.errorFromApi(mutationError);
    },
  });

  const handleSearchSubmit = () => {
    const nextSearch = search.trim();
    if (nextSearch === appliedSearch) return;
    setAppliedSearch(nextSearch);
  };

  const handleRealtimeSearch = (nextValue: string) => {
    const nextSearch = nextValue.trim();
    if (nextSearch === appliedSearch) return;
    setAppliedSearch(nextSearch);
  };

  const openCreate = () => {
    setSelectedDepartment(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedDepartment(undefined);
  };

  const handleDelete = (id: string) => {
    const targetDepartment = departments.find((dept) => dept.id === id);
    if (isCustomerServiceDepartmentName(targetDepartment?.name)) {
      return;
    }

    deleteMutation.mutate(id);
  };

  const handleSubmit = (data: DepartmentFormValues) => {
    if (createMutation.isPending || updateMutation.isPending) return;

    if (modalMode === "create") {
      createMutation.mutate(data);
      return;
    }

    if (modalMode === "edit" && selectedDepartment) {
      updateMutation.mutate({ id: selectedDepartment.id, data });
    }
  };

  const loading = isDepartmentsFetching || isPermissionsFetching;

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

      <StaffSearchInput
        placeholder={t("searchPlaceholder")}
        value={search}
        onChange={setSearch}
        onSearch={handleRealtimeSearch}
        onPressEnter={handleSearchSubmit}
      />

      <div className="flex-1 pb-4 h-full">
        <Spin
          spinning={loading}
          size="large"
          className="h-full [&_.ant-spin-nested-loading]:h-full [&_.ant-spin-container]:h-full"
        >
          {departments.length === 0 && !loading ? (
            <div className="h-full w-full flex justify-center items-center">
              <Empty description={t("empty")} />
            </div>
          ) : (
            <div className="h-full content-start grid grid-cols-1 gap-3 rounded-xl bg-[#f5f5f5] p-3 shadow-sm sm:gap-4 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <DepartmentCard
                  key={dept.id}
                  department={dept}
                  staffLabel={t("staff")}
                  permissionsLabel={t("permissions")}
                  viewLabel={t("actions.view")}
                  deleteLabel={t("actions.delete")}
                  deleteTitle={t("delete.title")}
                  deleteDescription={t("delete.description")}
                  deleteConfirmText={t("delete.confirm")}
                  cancelText={t("actions.cancel")}
                  getPermissionLabel={getPermissionLabel}
                  onView={openEdit}
                  onDelete={handleDelete}
                  canDelete={!isCustomerServiceDepartmentName(dept.name)}
                />
              ))}
            </div>
          )}
        </Spin>
      </div>

      <DepartmentModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        department={selectedDepartment}
        permissions={permissions}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
