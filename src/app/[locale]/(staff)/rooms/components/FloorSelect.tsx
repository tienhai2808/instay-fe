"use client";

import { useMemo, useState } from "react";
import { Input, Popconfirm, Select } from "antd";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import { Floor } from "@/types/data/floor";

interface SelectOption {
  label: string;
  value: string;
}

interface FloorSelectLabels {
  placeholder: string;
  branchPlaceholder: string;
  addPlaceholder: string;
  editPlaceholder: string;
  addButton: string;
  empty: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirm: string;
}

interface FloorSelectProps {
  value?: string;
  onChange?: (value?: string) => void;
  floors: Floor[];
  branchOptions: SelectOption[];
  loading?: boolean;
  labels: FloorSelectLabels;
  onCreateFloor: (name: string, branchId: string) => Promise<Floor | null>;
  onUpdateFloor: (
    id: string,
    name: string,
    branchId: string,
  ) => Promise<boolean>;
  onDeleteFloor: (id: string) => Promise<boolean>;
}

const getFloorLabel = (floor: Floor) => {
  const floorName = floor.name || `#${floor.id}`;
  const branchName = floor.branch?.name?.trim();
  return branchName ? `${floorName} - ${branchName}` : floorName;
};

const getNestedPopupContainer = (triggerNode: HTMLElement) =>
  triggerNode.parentElement || document.body;

export default function FloorSelect({
  value,
  onChange,
  floors,
  branchOptions,
  loading = false,
  labels,
  onCreateFloor,
  onUpdateFloor,
  onDeleteFloor,
}: FloorSelectProps) {
  const [open, setOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [createBranchId, setCreateBranchId] = useState<string | undefined>();
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingBranchId, setEditingBranchId] = useState<string | undefined>();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingFloorId, setDeletingFloorId] = useState<string | null>(null);

  const options = useMemo(
    () =>
      floors.map((floor) => ({
        value: floor.id,
        label: getFloorLabel(floor),
      })),
    [floors],
  );

  const handleCreateFloor = async () => {
    const nextName = createValue.trim();
    if (!nextName || !createBranchId || creating || loading) return;

    try {
      setCreating(true);
      const createdFloor = await onCreateFloor(nextName, createBranchId);
      if (!createdFloor) return;
      setCreateValue("");
      setCreateBranchId(undefined);
      onChange?.(createdFloor.id);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (floor: Floor) => {
    setEditingFloorId(floor.id);
    setEditingValue(floor.name || "");
    setEditingBranchId(floor.branch?.id);
  };

  const handleCancelEdit = () => {
    setEditingFloorId(null);
    setEditingValue("");
    setEditingBranchId(undefined);
  };

  const handleSaveEdit = async () => {
    if (!editingFloorId || !editingBranchId || updating || loading) return;
    const currentFloor = floors.find((floor) => floor.id === editingFloorId);
    if (!currentFloor) return;

    const nextName = editingValue.trim();
    if (!nextName) return;

    const hasChanges =
      nextName !== (currentFloor.name || "").trim() ||
      editingBranchId !== currentFloor.branch?.id;
    if (!hasChanges) return;

    try {
      setUpdating(true);
      const ok = await onUpdateFloor(editingFloorId, nextName, editingBranchId);
      if (!ok) return;
      handleCancelEdit();
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (floorId: string) => {
    if (loading) return;

    try {
      setDeletingFloorId(floorId);
      const ok = await onDeleteFloor(floorId);
      if (!ok) return;

      if (value === floorId) {
        onChange?.(undefined);
      }

      if (editingFloorId === floorId) {
        handleCancelEdit();
      }
    } finally {
      setDeletingFloorId(null);
    }
  };

  return (
    <Select
      value={value}
      onChange={(nextValue) => onChange?.(nextValue)}
      placeholder={labels.placeholder}
      options={options}
      allowClear
      showSearch
      optionFilterProp="label"
      open={open}
      onOpenChange={setOpen}
      className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
      disabled={loading}
      popupRender={() => (
        <div className="p-2">
          <div className="grid gap-2 border-b border-gray-200 pb-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={createValue}
              onChange={(event) => setCreateValue(event.target.value)}
              placeholder={labels.addPlaceholder}
              disabled={creating || loading}
              className="text-sm"
            />
            <Select
              value={createBranchId}
              onChange={setCreateBranchId}
              options={branchOptions}
              placeholder={labels.branchPlaceholder}
              disabled={creating || loading}
              showSearch
              optionFilterProp="label"
              getPopupContainer={getNestedPopupContainer}
              className="branch-inline-select"
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateFloor();
              }}
              disabled={
                loading || creating || !createValue.trim() || !createBranchId
              }
              className="inline-flex items-center justify-center gap-1 rounded-md bg-[#8b5cf6] px-2 py-1 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sm:justify-start"
            >
              <FiPlus className="text-sm" />
              {labels.addButton}
            </button>
          </div>

          <div className="mt-2 max-h-[260px] overflow-y-auto">
            {floors.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                {labels.empty}
              </div>
            ) : (
              floors.map((floor) => {
                const isSelected = value === floor.id;
                const isEditing = editingFloorId === floor.id;
                const isDeleting = deletingFloorId === floor.id;
                const hasEditingChanges =
                  editingValue.trim() !== (floor.name || "").trim() ||
                  editingBranchId !== floor.branch?.id;

                return (
                  <div
                    key={floor.id}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md ${
                      isSelected ? "bg-violet-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {isEditing ? (
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                        <Input
                          value={editingValue}
                          onChange={(event) =>
                            setEditingValue(event.target.value)
                          }
                          placeholder={labels.editPlaceholder}
                          disabled={updating}
                          className="text-sm"
                        />
                        <Select
                          value={editingBranchId}
                          onChange={setEditingBranchId}
                          options={branchOptions}
                          placeholder={labels.branchPlaceholder}
                          disabled={updating}
                          showSearch
                          optionFilterProp="label"
                          getPopupContainer={getNestedPopupContainer}
                          className="branch-inline-select"
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onChange?.(floor.id);
                          setOpen(false);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {floor.name || `#${floor.id}`}
                        </span>
                        {floor.branch?.name ? (
                          <span className="mt-0.5 inline-flex max-w-full items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            <span className="truncate">
                              {floor.branch.name}
                            </span>
                          </span>
                        ) : null}
                      </button>
                    )}

                    <div className="shrink-0 flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              void handleSaveEdit();
                            }}
                            disabled={
                              updating ||
                              !editingValue.trim() ||
                              !editingBranchId ||
                              !hasEditingChanges
                            }
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-green-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            aria-label={labels.save}
                          >
                            <FiCheck className="text-sm" />
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={updating}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            aria-label={labels.cancel}
                          >
                            <FiX className="text-sm" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(floor)}
                            disabled={loading || Boolean(deletingFloorId)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            aria-label={labels.edit}
                          >
                            <BiEditAlt className="text-blue-500 text-base" />
                          </button>

                          <Popconfirm
                            title={labels.deleteTitle}
                            description={labels.deleteDescription}
                            onConfirm={() => {
                              void handleDelete(floor.id);
                            }}
                            okText={labels.deleteConfirm}
                            cancelText={labels.cancel}
                            okButtonProps={{
                              danger: true,
                              loading: isDeleting,
                            }}
                          >
                            <button
                              type="button"
                              disabled={loading || Boolean(deletingFloorId)}
                              className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                              aria-label={labels.delete}
                            >
                              <BiTrashAlt className="text-red-500 text-base" />
                            </button>
                          </Popconfirm>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    />
  );
}
