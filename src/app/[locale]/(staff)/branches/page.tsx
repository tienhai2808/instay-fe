"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Spin } from "antd";
import { FiPlus } from "react-icons/fi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMessage } from "@/providers/MessageProvider";
import { queryKeys } from "@/constants/query-keys";
import { useTranslations } from "next-intl";
import {
  createBranch,
  deleteBranch,
  getBranches,
  updateBranch,
} from "@/apis/branch";
import type { Branch } from "@/types/data/branch";
import type { CreateBranchRequest } from "@/types/request/branch";
import { getVietnamProvinces } from "@/utils/vietnamese-provinces";
import BranchCard from "./components/Card";
import BranchFilter, { type BranchStatusFilter } from "./components/Filter";
import BranchModal from "./components/Modal";

type ModalMode = "create" | "edit";
type BranchFormValues = CreateBranchRequest;

export default function BranchPage() {
  const t = useTranslations("BranchPage");
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<
    BranchStatusFilter | undefined
  >(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedBranch, setSelectedBranch] = useState<Branch | undefined>();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextAppliedSearch = searchValue.trim();
      setAppliedSearch((prevSearch) =>
        prevSearch === nextAppliedSearch ? prevSearch : nextAppliedSearch,
      );
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue]);

  const statusValue =
    statusFilter === "active"
      ? true
      : statusFilter === "inactive"
        ? false
        : undefined;

  const branchParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: appliedSearch || undefined,
      city: selectedCity || undefined,
      is_active: statusValue,
    }),
    [appliedSearch, selectedCity, statusValue],
  );

  const {
    data: branchesRes,
    isFetching: isBranchesFetching,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.list(branchParams),
    queryFn: async () => getBranches(branchParams),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: provinces,
    error: provincesError,
    isFetching: isProvincesFetching,
  } = useQuery({
    queryKey: queryKeys.branches.locations(),
    queryFn: getVietnamProvinces,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (provincesError) {
      messageApi.error(t("locations.loadError"));
    }
  }, [messageApi, provincesError, t]);

  const branches = branchesRes?.data?.data?.branches || [];

  const cityOptions = useMemo(
    () =>
      (provinces || []).map((province) => ({
        label: province.name,
        value: province.name,
      })),
    [provinces],
  );

  const createMutation = useMutation({
    mutationFn: async (data: BranchFormValues) => createBranch(data),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: { id: string; data: BranchFormValues }) =>
      updateBranch(variables.id, variables.data),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteBranch(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.branches.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const openCreate = () => {
    setSelectedBranch(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBranch(undefined);
  };

  const handleSubmit = (data: BranchFormValues) => {
    if (createMutation.isPending || updateMutation.isPending) return;

    if (modalMode === "create") {
      createMutation.mutate(data);
      return;
    }

    if (modalMode === "edit" && selectedBranch) {
      updateMutation.mutate({ id: selectedBranch.id, data });
    }
  };

  const handleDelete = (branchId: string) => {
    deleteMutation.mutate(branchId);
  };

  const loading = isBranchesFetching || isProvincesFetching;

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] sm:w-auto"
        >
          <FiPlus className="text-sm" />
          {t("actions.create")}
        </button>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <BranchFilter
          loading={loading}
          searchValue={searchValue}
          cityValue={selectedCity}
          statusValue={statusFilter}
          cityOptions={cityOptions}
          labels={{
            searchPlaceholder: t("searchPlaceholder"),
            cityPlaceholder: t("filters.cityPlaceholder"),
            statusPlaceholder: t("status"),
            activeLabel: t("statuses.active"),
            inactiveLabel: t("statuses.inactive"),
          }}
          onSearchChange={setSearchValue}
          onCityChange={setSelectedCity}
          onStatusChange={setStatusFilter}
        />
      </div>

      <div className="h-full flex-1 pb-4">
        <Spin
          spinning={loading}
          size="large"
          className="h-full [&_.ant-spin-container]:h-full [&_.ant-spin-nested-loading]:h-full"
        >
          {branches.length === 0 && !loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Empty description={t("empty")} />
            </div>
          ) : (
            <div className="grid h-full content-start grid-cols-1 gap-3 rounded-2xl bg-[#f7f7f8] p-3 shadow-sm sm:gap-4 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <BranchCard
                  key={branch.id}
                  branch={branch}
                  locationLabel={t("location")}
                  statusLabel={t("status")}
                  activeLabel={t("statuses.active")}
                  inactiveLabel={t("statuses.inactive")}
                  viewLabel={t("actions.view")}
                  deleteLabel={t("actions.delete")}
                  deleteTitle={t("delete.title")}
                  deleteDescription={t("delete.description")}
                  deleteConfirmText={t("delete.confirm")}
                  cancelText={t("actions.cancel")}
                  onView={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Spin>
      </div>

      <BranchModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        branch={selectedBranch}
        provinces={provinces || []}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
