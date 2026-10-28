import { useMemo, useState } from "react";
import { Input, Popconfirm } from "antd";
import { BiBrush, BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { FiCheck, FiPlus, FiX } from "react-icons/fi";
import type { PricingTag } from "@/types/data/pricing_tag";
import { toRgbaColor } from "../utils/calendar-utils";

interface PricingTagPanelLabels {
  title: string;
  activeTool: string;
  clearTool: string;
  addButton: string;
  addPlaceholder: string;
  editPlaceholder: string;
  empty: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirm: string;
}

interface PricingTagPanelProps {
  tags: PricingTag[];
  activeTagId: number | null;
  tagColorById: Record<number, string>;
  loading?: boolean;
  labels: PricingTagPanelLabels;
  onSelectTag: (tagId: number) => void;
  onSelectClear: () => void;
  onCreateTag: (name: string) => Promise<PricingTag | null>;
  onUpdateTag: (id: number, name: string) => Promise<boolean>;
  onDeleteTag: (id: number) => Promise<boolean>;
}

export default function PricingTagPanel({
  tags,
  activeTagId,
  tagColorById,
  loading = false,
  labels,
  onSelectTag,
  onSelectClear,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: PricingTagPanelProps) {
  const [createValue, setCreateValue] = useState("");
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [updatingTagId, setUpdatingTagId] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);

  const isBusy =
    loading || creating || updatingTagId !== null || deletingTagId !== null;

  const sortedTags = useMemo(
    () => [...tags].sort((first, second) => first.id - second.id),
    [tags],
  );

  const activeTag = useMemo(() => {
    if (activeTagId === null) return null;
    return sortedTags.find((tag) => tag.id === activeTagId) || null;
  }, [activeTagId, sortedTags]);

  const handleCreateTag = async () => {
    const nextName = createValue.trim();
    if (!nextName || isBusy) return;

    try {
      setCreating(true);
      const createdTag = await onCreateTag(nextName);
      if (!createdTag) return;
      setCreateValue("");
      onSelectTag(createdTag.id);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (tag: PricingTag) => {
    setEditingTagId(tag.id);
    setEditingValue(tag.name || "");
  };

  const handleCancelEdit = () => {
    setEditingTagId(null);
    setEditingValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingTagId || isBusy) return;

    const currentTag = tags.find((tag) => tag.id === editingTagId);
    if (!currentTag) return;

    const nextName = editingValue.trim();
    if (!nextName) return;
    if (nextName === (currentTag.name || "").trim()) return;

    try {
      setUpdatingTagId(editingTagId);
      const ok = await onUpdateTag(editingTagId, nextName);
      if (!ok) return;
      handleCancelEdit();
    } finally {
      setUpdatingTagId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (isBusy) return;

    try {
      setDeletingTagId(id);
      const ok = await onDeleteTag(id);
      if (!ok) return;

      if (activeTagId === id) {
        onSelectClear();
      }

      if (editingTagId === id) {
        handleCancelEdit();
      }
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-[#111827]">
              {labels.title}
            </h2>
            <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
              {sortedTags.length}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#6b7280]">{labels.activeTool}</p>
        </div>

        <div className="inline-flex min-w-[180px] max-w-full items-center gap-2 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-3 py-2">
          {activeTag ? (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: tagColorById[activeTag.id] || "#8b5cf6",
                }}
              />
              <span className="truncate text-xs font-medium text-[#111827]">
                <BiBrush className="mr-1 inline text-sm text-[#6b7280]" />
                {activeTag.name || `#${activeTag.id}`}
              </span>
            </>
          ) : (
            <span className="truncate text-xs font-medium text-[#4b5563]">
              {labels.clearTool}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="rounded-lg border border-[#e5e7eb] bg-[#fafafa] p-3">
          {sortedTags.length === 0 ? (
            <div className="text-sm text-[#8c8c8c]">{labels.empty}</div>
          ) : (
            <div className="max-h-[124px] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSelectClear}
                  disabled={isBusy}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition ${
                    activeTagId === null
                      ? "border-[#7c3aed] bg-[#f5f3ff] text-[#6d28d9]"
                      : "border-[#d1d5db] bg-white text-[#4b5563] hover:border-[#8b5cf6]/50"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {labels.clearTool}
                </button>

                {sortedTags.map((tag) => {
                  const isActive = activeTagId === tag.id;
                  const tagColor = tagColorById[tag.id] || "#8b5cf6";

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onSelectTag(tag.id)}
                      disabled={isBusy}
                      className={`inline-flex h-8 max-w-[168px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                        isActive
                          ? "border-transparent text-white"
                          : "text-[#111827] hover:border-[#c4b5fd]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                      style={
                        isActive
                          ? { backgroundColor: tagColor }
                          : {
                              backgroundColor: toRgbaColor(tagColor, 0.1),
                              borderColor: toRgbaColor(tagColor, 0.45),
                            }
                      }
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: isActive ? "#ffffff" : tagColor,
                        }}
                      />
                      <span className="truncate">
                        {tag.name || `#${tag.id}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#e5e7eb] bg-white p-3">
          <div className="flex items-center gap-2">
            <Input
              value={createValue}
              onChange={(event) => setCreateValue(event.target.value)}
              placeholder={labels.addPlaceholder}
              disabled={isBusy}
              className="min-w-0 h-9! flex-1 text-sm"
              size="middle"
              onPressEnter={() => {
                void handleCreateTag();
              }}
            />

            <button
              type="button"
              onClick={() => {
                void handleCreateTag();
              }}
              disabled={isBusy || !createValue.trim()}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-[#111827] px-3 text-sm font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiPlus className="text-base" />
              {labels.addButton}
            </button>
          </div>

          <div className="mt-3 max-h-[136px] overflow-y-auto pr-1">
            {sortedTags.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#e5e7eb] px-2 py-2 text-xs text-[#8c8c8c]">
                {labels.empty}
              </div>
            ) : (
              sortedTags.map((tag) => {
                const isDeleting = deletingTagId === tag.id;
                const tagColor = tagColorById[tag.id] || "#8b5cf6";
                const isActive = activeTagId === tag.id;
                const isEditing = editingTagId === tag.id;
                const hasEditingChanges =
                  editingValue.trim() !== (tag.name || "").trim();

                return (
                  <div
                    key={tag.id}
                    className={`mb-1.5 rounded-md border px-2 py-1.5 transition last:mb-0 ${
                      isActive
                        ? "border-[#d9ccff] bg-[#f7f4ff]"
                        : "border-[#eceff3] bg-[#fafafa] hover:bg-[#f3f4f6]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Input
                          value={editingValue}
                          onChange={(event) =>
                            setEditingValue(event.target.value)
                          }
                          placeholder={labels.editPlaceholder}
                          disabled={isBusy}
                          className="min-w-0 flex-1 text-sm"
                          size="small"
                          onPressEnter={() => {
                            void handleSaveEdit();
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSelectTag(tag.id)}
                          disabled={isBusy}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tagColor }}
                          />
                          <span className="truncate text-sm font-medium text-[#111827]">
                            {tag.name || `#${tag.id}`}
                          </span>
                        </button>
                      )}

                      <div className="flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                void handleSaveEdit();
                              }}
                              disabled={
                                isBusy ||
                                !editingValue.trim() ||
                                !hasEditingChanges
                              }
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#d9e9dc] bg-white text-green-600 transition hover:bg-[#f0fdf4] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={labels.save}
                            >
                              <FiCheck className="text-sm" />
                            </button>

                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isBusy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#e5e7eb] bg-white text-[#6b7280] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={labels.cancel}
                            >
                              <FiX className="text-sm" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                handleStartEdit(tag);
                              }}
                              disabled={isBusy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#dbe2ea] bg-white text-blue-600 transition hover:border-blue-200 hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={labels.edit}
                            >
                              <BiEditAlt className="text-sm" />
                            </button>

                            <Popconfirm
                              title={labels.deleteTitle}
                              description={labels.deleteDescription}
                              onConfirm={() => {
                                void handleDelete(tag.id);
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
                                disabled={isBusy}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#f1d6d6] bg-white text-red-600 transition hover:border-red-200 hover:bg-[#fef2f2] disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={labels.delete}
                              >
                                <BiTrashAlt className="text-sm" />
                              </button>
                            </Popconfirm>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
