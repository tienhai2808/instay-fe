"use client";

import { useMemo, useState } from "react";
import { Input, Popconfirm, Select } from "antd";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import type { Source } from "@/types/data/source";

const OFFLINE_SOURCE_NAME = "Trực tiếp (Offline)";

const normalizeSourceName = (value?: string | null) =>
  (value || "").trim().toLocaleLowerCase();

const isOfflineSource = (value?: string | null) =>
  normalizeSourceName(value) === normalizeSourceName(OFFLINE_SOURCE_NAME);

interface SourceSelectLabels {
  placeholder: string;
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

interface SourceSelectProps {
  value?: string;
  onChange?: (value?: string) => void;
  sources: Source[];
  loading?: boolean;
  labels: SourceSelectLabels;
  onCreateSource: (name: string) => Promise<Source | null>;
  onUpdateSource: (id: string, name: string) => Promise<boolean>;
  onDeleteSource: (id: string) => Promise<boolean>;
}

export default function SourceSelect({
  value,
  onChange,
  sources,
  loading = false,
  labels,
  onCreateSource,
  onUpdateSource,
  onDeleteSource,
}: SourceSelectProps) {
  const [open, setOpen] = useState(false);
  const [createValue, setCreateValue] = useState("");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);

  const options = useMemo(
    () =>
      sources.map((source) => ({
        value: source.id,
        label: source.name || `#${source.id}`,
      })),
    [sources],
  );

  const handleCreateSource = async () => {
    const nextName = createValue.trim();
    if (!nextName || creating || loading) return;

    try {
      setCreating(true);
      const createdSource = await onCreateSource(nextName);
      if (!createdSource) return;
      setCreateValue("");
      onChange?.(createdSource.id);
      setOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (source: Source) => {
    if (isOfflineSource(source.name)) return;
    setEditingSourceId(source.id);
    setEditingValue(source.name || "");
  };

  const handleCancelEdit = () => {
    setEditingSourceId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingSourceId || updating || loading) return;
    const currentSource = sources.find(
      (source) => source.id === editingSourceId,
    );
    if (!currentSource) return;
    if (isOfflineSource(currentSource.name)) return;

    const nextName = editingValue.trim();
    if (!nextName) return;
    if (nextName === (currentSource.name || "").trim()) return;

    try {
      setUpdating(true);
      const ok = await onUpdateSource(editingSourceId, nextName);
      if (!ok) return;
      handleCancelEdit();
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (sourceId: string) => {
    if (loading) return;
    const source = sources.find((item) => item.id === sourceId);
    if (isOfflineSource(source?.name)) return;

    try {
      setDeletingSourceId(sourceId);
      const ok = await onDeleteSource(sourceId);
      if (!ok) return;

      if (value === sourceId) {
        onChange?.(undefined);
      }

      if (editingSourceId === sourceId) {
        handleCancelEdit();
      }
    } finally {
      setDeletingSourceId(null);
    }
  };

  return (
    <Select
      value={value}
      onChange={(nextValue) => onChange?.(nextValue)}
      placeholder={labels.placeholder}
      options={options}
      allowClear
      open={open}
      onOpenChange={setOpen}
      className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
      disabled={loading}
      popupRender={() => (
        <div className="p-2">
          <div className="flex flex-col items-stretch gap-2 border-b border-gray-200 pb-2 sm:flex-row sm:items-center">
            <Input
              value={createValue}
              onChange={(event) => setCreateValue(event.target.value)}
              placeholder={labels.addPlaceholder}
              disabled={creating || loading}
              className="text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => {
                void handleCreateSource();
              }}
              disabled={loading || creating || !createValue.trim()}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-[#8b5cf6] px-2 py-1 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sm:justify-start"
            >
              <FiPlus className="text-sm" />
              {labels.addButton}
            </button>
          </div>

          <div className="mt-2 max-h-[220px] overflow-y-auto">
            {sources.length === 0 ? (
              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                {labels.empty}
              </div>
            ) : (
              sources.map((source) => {
                const isSelected = value === source.id;
                const isEditing = editingSourceId === source.id;
                const isDeleting = deletingSourceId === source.id;
                const isProtectedSource = isOfflineSource(source.name);
                const hasEditingChanges =
                  editingValue.trim() !== (source.name || "").trim();

                return (
                  <div
                    key={source.id}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md ${
                      isSelected ? "bg-violet-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {isEditing ? (
                      <Input
                        value={editingValue}
                        onChange={(event) =>
                          setEditingValue(event.target.value)
                        }
                        placeholder={labels.editPlaceholder}
                        disabled={updating}
                        className="text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onChange?.(source.id);
                          setOpen(false);
                        }}
                        className="flex-1 text-left inline-flex items-center"
                      >
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                            isSelected
                              ? "bg-violet-100 text-violet-700 border-violet-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {source.name || `#${source.id}`}
                        </span>
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
                            onClick={() => handleStartEdit(source)}
                            disabled={
                              loading ||
                              Boolean(deletingSourceId) ||
                              isProtectedSource
                            }
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            aria-label={labels.edit}
                          >
                            <BiEditAlt className="text-blue-500 text-base" />
                          </button>

                          <Popconfirm
                            title={labels.deleteTitle}
                            description={labels.deleteDescription}
                            onConfirm={() => {
                              void handleDelete(source.id);
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
                              disabled={
                                loading ||
                                Boolean(deletingSourceId) ||
                                isProtectedSource
                              }
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
