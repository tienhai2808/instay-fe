"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Select, Spin } from "antd";
import { FiPlus } from "react-icons/fi";
import { getBasicBranches } from "@/apis/branch";
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from "@/apis/room_type";
import { queryKeys } from "@/constants/query-keys";
import RoomTypeModal from "./components/Modal";
import { RoomType } from "@/types/data/room_type";
import { useMessage } from "@/providers/MessageProvider";
import { useLocale, useTranslations } from "next-intl";
import StaffSearchInput from "@/components/staff/ui/SearchInput";
import RoomTypeCard from "./components/Card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ModalMode = "create" | "edit";

interface SelectOption {
  value: string;
  label: string;
}

interface RoomTypeFormValues {
  name: string;
  price: number;
  surfaceArea: number;
  maxPeople: number;
  branchIds: string[];
}

export default function RoomTypesPage() {
  const t = useTranslations("RoomTypesPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [branchIdFilter, setBranchIdFilter] = useState<string | undefined>(
    undefined,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState<
    string | undefined
  >(undefined);

  const roomTypesParams = useMemo(
    () => ({
      search: appliedSearch || undefined,
      branch_id: branchIdFilter,
    }),
    [appliedSearch, branchIdFilter],
  );

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
    data: roomTypesRes,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.roomTypes.list(roomTypesParams),
    queryFn: async () => getRoomTypes(roomTypesParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (error) {
      messageApi.errorFromApi(error);
    }
  }, [error, messageApi]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  const branches = useMemo(
    () => branchesRes?.data?.data?.branches || [],
    [branchesRes?.data?.data?.branches],
  );
  const branchOptions = useMemo<SelectOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name || `#${branch.id}`,
      })),
    [branches],
  );

  const roomTypes = useMemo(
    () => roomTypesRes?.data?.data?.room_types || [],
    [roomTypesRes?.data?.data?.room_types],
  );
  const selectedRoomType = useMemo(() => {
    if (!selectedRoomTypeId) return undefined;
    return roomTypes.find((roomType) => roomType.id === selectedRoomTypeId);
  }, [roomTypes, selectedRoomTypeId]);

  const createMutation = useMutation({
    mutationFn: async (data: RoomTypeFormValues) =>
      createRoomType({
        name: data.name,
        price: data.price,
        surface_area: data.surfaceArea,
        max_people: data.maxPeople,
        branch_ids: data.branchIds,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
      });
    },
    onError: (mutationError) => {
      messageApi.errorFromApi(mutationError);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: { id: string; data: RoomTypeFormValues }) =>
      updateRoomType(variables.id, {
        name: variables.data.name,
        price: variables.data.price,
        surface_area: variables.data.surfaceArea,
        max_people: variables.data.maxPeople,
        branch_ids: variables.data.branchIds,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
      });
    },
    onError: (mutationError) => {
      messageApi.errorFromApi(mutationError);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteRoomType(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
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

  const handleBranchChange = (value?: string) => {
    if (value === branchIdFilter) return;
    setBranchIdFilter(value);
  };

  const openCreate = () => {
    setSelectedRoomTypeId(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (roomType: RoomType) => {
    setSelectedRoomTypeId(roomType.id);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRoomTypeId(undefined);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleSubmit = (data: RoomTypeFormValues) => {
    if (createMutation.isPending || updateMutation.isPending) return;

    if (modalMode === "create") {
      createMutation.mutate(data);
      return;
    }

    if (modalMode === "edit" && selectedRoomType) {
      updateMutation.mutate({ id: selectedRoomType.id, data });
    }
  };

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

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <StaffSearchInput
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={setSearch}
          onSearch={handleRealtimeSearch}
          onPressEnter={handleSearchSubmit}
          className="w-full min-w-0 flex-1 text-sm! sm:min-w-[260px] sm:max-w-[480px]"
        />

        <Select
          size="large"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t("filters.branch")}
          value={branchIdFilter}
          onChange={handleBranchChange}
          options={branchOptions}
          className="w-full min-w-0 text-sm! sm:min-w-[220px] sm:w-auto"
          disabled={isBranchesFetching}
        />
      </div>

      <div className="flex-1 pb-4 h-full">
        <Spin
          spinning={isFetching}
          size="large"
          className="h-full [&_.ant-spin-nested-loading]:h-full [&_.ant-spin-container]:h-full"
        >
          {roomTypes.length === 0 && !isFetching ? (
            <div className="h-full w-full flex justify-center items-center">
              <Empty description={t("empty")} />
            </div>
          ) : (
            <div className="h-full content-start grid grid-cols-1 gap-3 rounded-xl bg-[#f5f5f5] p-3 shadow-sm sm:gap-4 sm:p-4 md:grid-cols-2 lg:grid-cols-3">
              {roomTypes.map((roomType) => (
                <RoomTypeCard
                  key={roomType.id}
                  roomType={roomType}
                  locale={locale}
                  peopleLabel={t("people")}
                  nightLabel={t("night")}
                  roomsLabel={t("rooms")}
                  priceLabel={t("form.price")}
                  surfaceAreaLabel={t("form.surfaceArea")}
                  maxPeopleLabel={t("form.maxPeople")}
                  branchesLabel={t("form.branches")}
                  noBranchesLabel={t("noBranches")}
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

      <RoomTypeModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        roomType={selectedRoomType}
        branchOptions={branchOptions}
        branchLoading={isBranchesFetching}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
