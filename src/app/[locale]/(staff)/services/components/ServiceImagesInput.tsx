"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Tag, Upload } from "antd";
import type { UploadProps } from "antd";
import { CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { FiArrowDown, FiArrowUp, FiMove } from "react-icons/fi";

export interface ServiceImageInputItem {
  id: string;
  key?: string;
  file?: File;
  preview_url: string;
  is_thumbnail: boolean;
}

interface ServiceImagesInputLabels {
  title: string;
  hint: string;
  dragHint: string;
  thumbnail: string;
  setThumbnail: string;
  noImages: string;
  removeImage: string;
}

interface ServiceImagesInputProps {
  value: ServiceImageInputItem[];
  onChange: (nextValue: ServiceImageInputItem[]) => void;
  labels: ServiceImagesInputLabels;
  disabled?: boolean;
}

const isBlobUrl = (value?: string) => Boolean(value?.startsWith("blob:"));

const normalizeThumbnail = (items: ServiceImageInputItem[]) => {
  if (!items.length) return items;

  const selectedIndex = items.findIndex((item) => item.is_thumbnail);
  const thumbnailIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return items.map((item, index) => ({
    ...item,
    is_thumbnail: index === thumbnailIndex,
  }));
};

const buildImageItem = (file: File): ServiceImageInputItem => ({
  id:
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `service-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  file,
  preview_url: URL.createObjectURL(file),
  is_thumbnail: false,
});

export default function ServiceImagesInput({
  value,
  onChange,
  labels,
  disabled = false,
}: ServiceImagesInputProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const previousUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const previousUrls = previousUrlsRef.current;
    const nextUrls = new Map(value.map((item) => [item.id, item.preview_url]));

    previousUrls.forEach((url, id) => {
      if (!nextUrls.has(id) && isBlobUrl(url)) {
        URL.revokeObjectURL(url);
      }
    });

    previousUrlsRef.current = nextUrls;
  }, [value]);

  useEffect(() => {
    return () => {
      previousUrlsRef.current.forEach((url) => {
        if (isBlobUrl(url)) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= value.length || toIndex >= value.length) return;

    const nextItems = [...value];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(toIndex, 0, movedItem);
    onChange(normalizeThumbnail(nextItems));
  };

  const handleBeforeUpload: UploadProps["beforeUpload"] = (file) => {
    if (disabled) return Upload.LIST_IGNORE;

    const nextItem = buildImageItem(file as File);
    onChange(normalizeThumbnail([...value, nextItem]));
    return Upload.LIST_IGNORE;
  };

  const handleRemove = (id: string) => {
    if (disabled) return;
    const nextItems = value.filter((item) => item.id !== id);
    onChange(normalizeThumbnail(nextItems));
  };

  const handleSetThumbnail = (id: string) => {
    if (disabled) return;
    onChange(
      value.map((item) => ({
        ...item,
        is_thumbnail: item.id === id,
      })),
    );
  };

  const orderedItems = useMemo(() => normalizeThumbnail(value), [value]);

  return (
    <div className="flex flex-col gap-4">
      <Upload.Dragger
        accept="image/*"
        multiple
        showUploadList={false}
        beforeUpload={handleBeforeUpload}
        disabled={disabled}
        className="h-[156px] [&_.ant-upload-drag]:!h-[156px] [&_.ant-upload-drag]:!border-dashed [&_.ant-upload-drag]:!border-gray-300 [&_.ant-upload-drag]:!bg-[#fafafa] [&_.ant-upload-btn]:!h-full [&_.ant-upload-btn]:!flex [&_.ant-upload-btn]:!flex-col [&_.ant-upload-btn]:!items-center [&_.ant-upload-btn]:!justify-center"
      >
        <p className="mb-2 text-gray-500 flex justify-center">
          <InboxOutlined className="text-3xl" />
        </p>
        <p className="text-sm font-medium text-gray-800">{labels.title}</p>
        <p className="text-xs text-gray-500">{labels.hint}</p>
      </Upload.Dragger>

      {orderedItems.length === 0 ? (
        <div className="h-[132px] rounded-lg border border-dashed border-gray-300 bg-[#fafafa] text-xs text-gray-500 flex items-center justify-center px-4 text-center">
          {labels.noImages}
        </div>
      ) : (
        <>
          <div className="text-xs text-gray-500">{labels.dragHint}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {orderedItems.map((item, index) => {
              const isDragging = draggingId === item.id;
              const isDragOver = dragOverId === item.id;
              const canMoveUp = index > 0;
              const canMoveDown = index < orderedItems.length - 1;

              return (
                <div
                  key={item.id}
                  draggable={!disabled}
                  onDragStart={() => {
                    if (disabled) return;
                    setDraggingId(item.id);
                  }}
                  onDragOver={(event) => {
                    if (disabled) return;
                    event.preventDefault();
                    setDragOverId(item.id);
                  }}
                  onDrop={(event) => {
                    if (disabled) return;
                    event.preventDefault();

                    if (!draggingId || draggingId === item.id) {
                      setDraggingId(null);
                      setDragOverId(null);
                      return;
                    }

                    const fromIndex = orderedItems.findIndex(
                      (image) => image.id === draggingId,
                    );
                    const toIndex = orderedItems.findIndex(
                      (image) => image.id === item.id,
                    );
                    moveItem(fromIndex, toIndex);
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                  }}
                  className={`relative rounded-lg border bg-white transition ${
                    isDragOver
                      ? "border-[#8b5cf6] ring-2 ring-violet-200"
                      : "border-gray-200"
                  } ${isDragging ? "opacity-70" : "opacity-100"}`}
                >
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 border border-gray-300 text-gray-600 hover:bg-white transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed"
                    aria-label={labels.removeImage}
                    disabled={disabled}
                  >
                    <CloseOutlined className="text-xs" />
                  </button>

                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    <Tag className="!m-0 !border !border-solid !border-gray-300 !bg-white !text-gray-600 !text-xs !leading-5 !font-medium !px-2 !py-0">
                      #{index + 1}
                    </Tag>
                    {item.is_thumbnail && (
                      <Tag className="!m-0 !border !border-solid !border-green-200 !bg-green-50 !text-green-600 !text-xs !leading-5 !font-medium !px-2 !py-0">
                        {labels.thumbnail}
                      </Tag>
                    )}
                  </div>

                  <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-[#fafafa] p-2">
                    <Image
                      src={item.preview_url}
                      alt={`service-image-${index + 1}`}
                      rootClassName="!block !h-full !w-full"
                      className="!object-cover !block !h-full !w-full [&_.ant-image]:!block [&_.ant-image]:!h-full [&_.ant-image]:!w-full [&_.ant-image-img]:!h-full [&_.ant-image-img]:!w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => handleSetThumbnail(item.id)}
                      disabled={disabled || item.is_thumbnail}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                        item.is_thumbnail
                          ? "bg-[#111827] text-white cursor-not-allowed"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                      }`}
                    >
                      {item.is_thumbnail
                        ? labels.thumbnail
                        : labels.setThumbnail}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(index, index - 1)}
                        disabled={disabled || !canMoveUp}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="move-up"
                      >
                        <FiArrowUp className="text-sm" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(index, index + 1)}
                        disabled={disabled || !canMoveDown}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="move-down"
                      >
                        <FiArrowDown className="text-sm" />
                      </button>
                      <span className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-400">
                        <FiMove className="text-sm" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
