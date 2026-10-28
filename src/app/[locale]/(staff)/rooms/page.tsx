"use client";

import { useEffect, useMemo, useState, type Key } from "react";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiMoreVertical, FiPlus } from "react-icons/fi";
import { Dropdown, Empty, Popconfirm, Table, Tag } from "antd";
import type { MenuProps } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useLocale, useTranslations } from "next-intl";
import { getBasicBranches } from "@/apis/branch";
import { createFloor, deleteFloor, getFloors, updateFloor } from "@/apis/floor";
import {
  createRoom,
  deleteRoom,
  deleteRooms,
  getRooms,
  updateRoom,
} from "@/apis/room_list";
import { getRoomTypes } from "@/apis/room_type";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import { Floor } from "@/types/data/floor";
import { Room } from "@/types/data/room";
import { RoomsResponseData } from "@/types/response/room";
import RoomsFilter from "./components/Filter";
import RoomModal, { RoomFormValues } from "./components/Modal";
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

const normalizeRoomsResponse = (
  payload: RoomsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const rooms = payload?.rooms || [];
  const pagination = payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const hasPrev = Boolean(pagination?.has_prev);
  const hasNext = Boolean(pagination?.has_next);
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const estimatedTotalFromFlags = hasNext
    ? page * limit + 1
    : Math.max((page - 1) * limit + rooms.length, rooms.length);
  const total = totalFromApi ?? estimatedTotalFromFlags;
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    rooms,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

const isFloorShape = (value: unknown): value is Floor => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id?: unknown }).id === "string"
  );
};

const getFloorOptionLabel = (floor: Floor) => {
  const floorName = floor.name || `#${floor.id}`;
  const branchName = floor.branch?.name?.trim();
  return branchName ? `${floorName} - ${branchName}` : floorName;
};

const extractCreatedFloor = (payload: unknown): Floor | null => {
  if (isFloorShape(payload)) return payload;

  if (typeof payload === "object" && payload !== null && "floor" in payload) {
    const floor = (payload as { floor?: unknown }).floor;
    if (isFloorShape(floor)) return floor;
  }

  return null;
};

export default function RoomsPage() {
  const t = useTranslations("RoomsPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [branchIdFilter, setBranchIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [roomTypeIdFilter, setRoomTypeIdFilter] = useState<string | undefined>(
    undefined,
  );
  const [floorIdFilter, setFloorIdFilter] = useState<string | undefined>(
    undefined,
  );

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedRoom, setSelectedRoom] = useState<Room | undefined>(undefined);
  const selectedIds = useMemo(
    () =>
      Array.from(
        new Set(selectedRowKeys.map((key) => String(key)).filter(Boolean)),
      ),
    [selectedRowKeys],
  );
  const hasSelectedRows = selectedIds.length > 0;

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, [locale]);

  const roomsParams = useMemo(
    () => ({
      page,
      limit,
      sort: "created_at" as const,
      order: "desc" as const,
      branch_id: branchIdFilter,
      room_type_id: roomTypeIdFilter,
      floor_id: floorIdFilter,
      search: appliedSearch || undefined,
    }),
    [
      appliedSearch,
      branchIdFilter,
      floorIdFilter,
      limit,
      page,
      roomTypeIdFilter,
    ],
  );
  const roomTypesParams = useMemo(
    () => ({
      view: "basic" as const,
      branch_id: branchIdFilter,
    }),
    [branchIdFilter],
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
    isFetching: isRoomTypesFetching,
    error: roomTypesError,
  } = useQuery({
    queryKey: queryKeys.roomTypes.list(roomTypesParams),
    queryFn: async () => getRoomTypes(roomTypesParams),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: floorsRes,
    isFetching: isFloorsFetching,
    error: floorsError,
  } = useQuery({
    queryKey: queryKeys.floors.basic(),
    queryFn: async () => getFloors({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: roomsRes,
    isFetching: isRoomsFetching,
    error: roomsError,
  } = useQuery({
    queryKey: queryKeys.rooms.list(roomsParams),
    queryFn: async () => getRooms(roomsParams),
    placeholderData: (previousData) => previousData,
  });

  const loading =
    isBranchesFetching ||
    isRoomTypesFetching ||
    isFloorsFetching ||
    isRoomsFetching;

  const normalized = useMemo(() => {
    return normalizeRoomsResponse(roomsRes?.data?.data, page, limit);
  }, [limit, page, roomsRes?.data?.data]);

  const rooms = normalized.rooms;
  const branches = useMemo(
    () => branchesRes?.data?.data?.branches || [],
    [branchesRes?.data?.data?.branches],
  );
  const floors = useMemo(
    () => floorsRes?.data?.data?.floors || [],
    [floorsRes?.data?.data?.floors],
  );
  const filteredFloors = useMemo(() => {
    if (!branchIdFilter) return floors;
    return floors.filter((floor) => floor.branch?.id === branchIdFilter);
  }, [branchIdFilter, floors]);

  const branchOptions = useMemo<SelectOption[]>(
    () =>
      branches.map((branch) => ({
        value: branch.id,
        label: branch.name || `#${branch.id}`,
      })),
    [branches],
  );

  const floorOptions = useMemo<SelectOption[]>(
    () =>
      filteredFloors.map((floor) => ({
        value: floor.id,
        label: getFloorOptionLabel(floor),
      })),
    [filteredFloors],
  );

  const roomTypeOptions = useMemo<SelectOption[]>(
    () =>
      (roomTypesRes?.data?.data?.room_types || []).map((roomType) => ({
        value: roomType.id,
        label: roomType.name || `#${roomType.id}`,
      })),
    [roomTypesRes?.data?.data?.room_types],
  );

  const roomMutation = useMutation({
    mutationFn: async (variables: {
      mode: ModalMode;
      values: RoomFormValues;
    }) => {
      if (variables.mode === "create") {
        return createRoom(variables.values);
      }

      if (!selectedRoom) {
        throw new Error("ROOM_NOT_FOUND");
      }

      return updateRoom(selectedRoom.id, variables.values);
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeModal();
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (variables: { id: string } | { ids: string[] }) =>
      "id" in variables ? deleteRoom(variables.id) : deleteRooms(variables.ids),
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const createFloorMutation = useMutation({
    mutationFn: async (variables: { name: string; branchId: string }) =>
      createFloor({ name: variables.name, branch_id: variables.branchId }),
  });

  const updateFloorMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      name: string;
      branchId: string;
    }) =>
      updateFloor(variables.id, {
        name: variables.name,
        branch_id: variables.branchId,
      }),
  });

  const deleteFloorMutation = useMutation({
    mutationFn: async (id: string) => deleteFloor(id),
  });

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (roomTypesError) {
      messageApi.errorFromApi(roomTypesError);
    }
  }, [messageApi, roomTypesError]);

  useEffect(() => {
    if (floorsError) {
      messageApi.errorFromApi(floorsError);
    }
  }, [floorsError, messageApi]);

  useEffect(() => {
    if (roomsError) {
      messageApi.errorFromApi(roomsError);
    }
  }, [messageApi, roomsError]);

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

  const openCreate = () => {
    setSelectedRoom(undefined);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setSelectedRoom(room);
    setModalMode("edit");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedRoom(undefined);
  };

  const handleDeleteRoom = (room: Room) => {
    deleteRoomMutation.mutate({ id: room.id });
  };

  const handleDeleteSelectedRooms = () => {
    if (!hasSelectedRows || deleteRoomMutation.isPending) return;
    deleteRoomMutation.mutate({ ids: selectedIds });
  };

  const handleSubmit = (values: RoomFormValues) => {
    if (roomMutation.isPending) return;
    roomMutation.mutate({ mode: modalMode, values });
  };

  const handleCreateFloor = async (name: string, branchId: string) => {
    try {
      const res = await createFloorMutation.mutateAsync({ name, branchId });
      messageApi.fromApi(res.data, "success");

      await queryClient.invalidateQueries({ queryKey: queryKeys.floors.all });

      const createdFloor = extractCreatedFloor(res.data.data);
      if (createdFloor) {
        return createdFloor;
      }

      const latestFloorsRes = await queryClient.fetchQuery({
        queryKey: queryKeys.floors.list({ view: "basic", branch_id: branchId }),
        queryFn: async () => getFloors({ view: "basic", branch_id: branchId }),
      });
      const latestFloors = latestFloorsRes.data.data.floors || [];
      return (
        latestFloors.find(
          (floor) => floor.name === name && floor.branch?.id === branchId,
        ) || null
      );
    } catch (error) {
      messageApi.errorFromApi(error);
      return null;
    }
  };

  const handleUpdateFloor = async (
    id: string,
    name: string,
    branchId: string,
  ) => {
    try {
      const res = await updateFloorMutation.mutateAsync({ id, name, branchId });
      messageApi.fromApi(res.data, "success");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.floors.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      ]);
      return true;
    } catch (error) {
      messageApi.errorFromApi(error);
      return false;
    }
  };

  const handleDeleteFloor = async (id: string) => {
    try {
      const res = await deleteFloorMutation.mutateAsync(id);
      messageApi.fromApi(res.data, "success");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.floors.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }),
      ]);

      if (floorIdFilter === id) {
        setFloorIdFilter(undefined);
        setPage(1);
      }
      return true;
    } catch (error) {
      messageApi.errorFromApi(error);
      return false;
    }
  };

  const handleBranchChange = (value?: string) => {
    if (value === branchIdFilter) return;
    const selectedFloor = floors.find((floor) => floor.id === floorIdFilter);

    setPage(1);
    setBranchIdFilter(value);
    setRoomTypeIdFilter(undefined);

    if (value && selectedFloor?.branch?.id !== value) {
      setFloorIdFilter(undefined);
    }
  };

  const handleRoomTypeChange = (value?: string) => {
    if (value === roomTypeIdFilter) return;
    setPage(1);
    setRoomTypeIdFilter(value);
  };

  const handleFloorChange = (value?: string) => {
    if (value === floorIdFilter) return;
    setPage(1);
    setFloorIdFilter(value);
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

  const columns: ColumnsType<Room> = [
    {
      title: t("table.roomName"),
      key: "roomName",
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
      title: t("table.roomType"),
      key: "roomType",
      dataIndex: ["room_type", "name"],
      render: (value?: string) => value || "-",
    },
    {
      title: t("table.branch"),
      key: "branch",
      render: (_, record) => record.floor?.branch?.name || "-",
    },
    {
      title: t("table.floor"),
      key: "floor",
      dataIndex: ["floor", "name"],
      render: (value?: string) => value || "-",
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
                      handleDeleteRoom(record);
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
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {hasSelectedRows ? (
            <p className="text-xs text-[#8c8c8c]">
              {t("selection.selected", { count: selectedIds.length })}
            </p>
          ) : null}
          <button
            onClick={hasSelectedRows ? handleDeleteSelectedRooms : openCreate}
            disabled={hasSelectedRows ? deleteRoomMutation.isPending : false}
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
        <RoomsFilter
          loading={loading}
          searchValue={searchValue}
          branchIdValue={branchIdFilter}
          roomTypeIdValue={roomTypeIdFilter}
          floorIdValue={floorIdFilter}
          branchOptions={branchOptions}
          roomTypeOptions={roomTypeOptions}
          floorOptions={floorOptions}
          onSearchChange={setSearchValue}
          onBranchChange={handleBranchChange}
          onRoomTypeChange={handleRoomTypeChange}
          onFloorChange={handleFloorChange}
          labels={{
            searchPlaceholder: t("filters.searchPlaceholder"),
            branchPlaceholder: t("filters.branch"),
            roomTypePlaceholder: t("filters.roomType"),
            floorPlaceholder: t("filters.floor"),
          }}
        />
      </div>

      {rooms.length === 0 && !loading ? (
        <div className="h-full w-full flex justify-center items-center">
          <Empty description={t("empty")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto bg-white">
          <Table
            loading={loading}
            columns={columns}
            dataSource={rooms}
            rowKey="id"
            scroll={{ x: 1050 }}
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
                      total: rooms.length,
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

      <RoomModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        room={selectedRoom}
        roomTypeOptions={roomTypeOptions}
        floors={floors}
        branchOptions={branchOptions}
        submitting={
          roomMutation.isPending ||
          createFloorMutation.isPending ||
          updateFloorMutation.isPending ||
          deleteFloorMutation.isPending
        }
        onSubmit={handleSubmit}
        onCreateFloor={handleCreateFloor}
        onUpdateFloor={handleUpdateFloor}
        onDeleteFloor={handleDeleteFloor}
      />
    </div>
  );
}
