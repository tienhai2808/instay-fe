"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Popconfirm, Spin } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { FiPlus } from "react-icons/fi";
import { BiEditAlt, BiTrashAlt } from "react-icons/bi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRoomTypePrice,
  deleteRoomTypePrice,
  updateRoomTypePrice,
} from "@/apis/room_type_price";
import { getPricingTags } from "@/apis/pricing_tag";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { RoomType } from "@/types/data/room_type";
import type {
  RoomTypePrice,
  RoomTypePriceType,
} from "@/types/data/room_type_price";
import RoomTypePriceFormModal, {
  type RoomTypePriceDirection,
  type RoomTypePriceFormSubmitValues,
} from "./RoomTypePriceFormModal";

interface RoomTypePricingStrategiesSectionProps {
  roomType: RoomType;
}

type PriceFormMode = "create" | "edit";

const toNormalizedId = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return String(Math.floor(value));
  }

  return null;
};

const toNormalizedPositiveNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
};

const toNormalizedPricingType = (value: unknown): RoomTypePriceType =>
  value === "amount" ? "amount" : "percent";

const toDirection = (value: number): RoomTypePriceDirection =>
  value < 0 ? "decrease" : "increase";

const toSignedValue = (direction: RoomTypePriceDirection, value: number) => {
  const normalizedValue = Math.abs(value);
  return direction === "decrease" ? -normalizedValue : normalizedValue;
};

export default function RoomTypePricingStrategiesSection({
  roomType,
}: RoomTypePricingStrategiesSectionProps) {
  const t = useTranslations("RoomTypesPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [formMode, setFormMode] = useState<PriceFormMode>("create");
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const {
    data: pricingTagsRes,
    isFetching: isPricingTagsFetching,
    error: pricingTagsError,
  } = useQuery({
    queryKey: queryKeys.pricingTags.basic(),
    queryFn: async () => getPricingTags({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: Boolean(roomType.id),
  });

  useEffect(() => {
    if (pricingTagsError) {
      messageApi.errorFromApi(pricingTagsError);
    }
  }, [messageApi, pricingTagsError]);

  const createMutation = useMutation({
    mutationFn: async (values: {
      room_type_id: string;
      pricing_tag_id: string;
      pricing_type: RoomTypePriceType;
      pricing_value: number;
    }) => createRoomTypePrice(values),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeFormModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: {
      id: string;
      pricing_type: RoomTypePriceType;
      pricing_value: number;
    }) =>
      updateRoomTypePrice(values.id, {
        pricing_type: values.pricing_type,
        pricing_value: values.pricing_value,
      }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      closeFormModal();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteRoomTypePrice(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.roomTypes.all,
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const normalizedRoomTypePrices = useMemo<RoomTypePrice[]>(() => {
    return (roomType.room_type_prices || [])
      .map((item) => {
        const id = toNormalizedId(item.id);
        const roomTypeId =
          toNormalizedId(item.room_type_id) || toNormalizedId(roomType.id);
        const pricingTagId =
          toNormalizedId(item.pricing_tag_id) ||
          toNormalizedId(item.pricing_tag?.id);

        if (!id || !roomTypeId || !pricingTagId) return null;

        const pricingTagName = (item.pricing_tag?.name || "").trim();

        return {
          id,
          room_type_id: roomTypeId,
          pricing_tag_id: pricingTagId,
          pricing_type: toNormalizedPricingType(item.pricing_type),
          pricing_value: toNormalizedPositiveNumber(item.pricing_value),
          pricing_tag: pricingTagName
            ? {
                id: pricingTagId,
                name: pricingTagName,
              }
            : null,
        } as RoomTypePrice;
      })
      .filter((item): item is RoomTypePrice => Boolean(item));
  }, [roomType.id, roomType.room_type_prices]);

  const selectedPrice = useMemo(() => {
    if (!selectedPriceId) return undefined;
    return normalizedRoomTypePrices.find((item) => item.id === selectedPriceId);
  }, [normalizedRoomTypePrices, selectedPriceId]);

  const normalizedPricingTags = useMemo(() => {
    return (pricingTagsRes?.data?.data?.pricing_tags || [])
      .map((tag) => {
        const normalizedId = toNormalizedId(tag.id);
        const normalizedName = (tag.name || "").trim();

        if (!normalizedId || !normalizedName) return null;

        return {
          id: normalizedId,
          name: normalizedName,
        };
      })
      .filter((tag): tag is { id: string; name: string } => Boolean(tag));
  }, [pricingTagsRes?.data?.data?.pricing_tags]);

  const assignedTagIds = useMemo(() => {
    return new Set(normalizedRoomTypePrices.map((item) => item.pricing_tag_id));
  }, [normalizedRoomTypePrices]);

  const availableCreateTagOptions = useMemo(() => {
    return normalizedPricingTags
      .filter((tag) => !assignedTagIds.has(tag.id))
      .map((tag) => ({ value: tag.id, label: tag.name }));
  }, [assignedTagIds, normalizedPricingTags]);

  const allTagOptions = useMemo(() => {
    return normalizedPricingTags.map((tag) => ({
      value: tag.id,
      label: tag.name,
    }));
  }, [normalizedPricingTags]);

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeletePending = deleteMutation.isPending;
  const isBusy = isFormSubmitting || isDeletePending;
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US"),
    [locale],
  );

  const closeFormModal = () => {
    setFormOpen(false);
    setSelectedPriceId(null);
    setFormMode("create");
  };

  const openCreateModal = () => {
    setFormMode("create");
    setSelectedPriceId(null);
    setFormOpen(true);
  };

  const openEditModal = (roomTypePriceId: string) => {
    setFormMode("edit");
    setSelectedPriceId(roomTypePriceId);
    setFormOpen(true);
  };

  const handleSubmit = (values: RoomTypePriceFormSubmitValues) => {
    const signedValue = toSignedValue(values.direction, values.pricing_value);

    if (formMode === "create") {
      createMutation.mutate({
        room_type_id: roomType.id,
        pricing_tag_id: values.pricing_tag_id,
        pricing_type: values.pricing_type,
        pricing_value: signedValue,
      });
      return;
    }

    if (!selectedPrice) return;

    updateMutation.mutate({
      id: selectedPrice.id,
      pricing_type: values.pricing_type,
      pricing_value: signedValue,
    });
  };

  const handleDelete = (id: string) => {
    if (isBusy) return;
    deleteMutation.mutate(id);
  };

  const getPricingTypeLabel = (pricingType: RoomTypePriceType) =>
    t(`pricingStrategies.options.type.${pricingType}`);

  const getDirectionLabel = (pricingValue: number) =>
    t(`pricingStrategies.options.direction.${toDirection(pricingValue)}`);

  const getPricingValueLabel = (
    pricingType: RoomTypePriceType,
    pricingValue: number,
  ) => {
    const absoluteValue = Math.abs(pricingValue);

    if (pricingType === "percent") {
      return `${numberFormatter.format(absoluteValue)}%`;
    }

    return numberFormatter.format(absoluteValue);
  };

  const getSignedValueLabel = (
    pricingType: RoomTypePriceType,
    pricingValue: number,
  ) => {
    const sign = pricingValue < 0 ? "-" : "+";
    return `${sign}${getPricingValueLabel(pricingType, pricingValue)}`;
  };

  const createDisabled = availableCreateTagOptions.length === 0 || isBusy;

  return (
    <div className="mb-2 mt-4 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#374151]">
            {t("pricingStrategies.title")}
          </h4>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={createDisabled}
          title={
            createDisabled
              ? t("pricingStrategies.actions.addDisabled")
              : undefined
          }
          className="inline-flex items-center gap-2 rounded-md bg-[#111827] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiPlus className="text-sm" />
          {t("pricingStrategies.actions.add")}
        </button>
      </div>

      {!isPricingTagsFetching &&
        createDisabled &&
        availableCreateTagOptions.length === 0 && (
          <div className="mb-3 rounded-md border border-dashed border-[#d1d5db] bg-white px-3 py-2 text-xs text-[#6B7280]">
            {t("pricingStrategies.actions.addDisabled")}
          </div>
        )}

      <Spin spinning={isPricingTagsFetching} size="small">
        {normalizedRoomTypePrices.length === 0 ? (
          <div className="rounded-lg bg-white p-6">
            <Empty description={t("pricingStrategies.empty")} />
          </div>
        ) : (
          <div className="max-h-[220px] overflow-y-auto pr-1">
            <div className="flex flex-col gap-2">
              {normalizedRoomTypePrices.map((roomTypePrice) => (
                <div
                  key={roomTypePrice.id}
                  className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate text-sm font-semibold text-[#111827]">
                          {roomTypePrice.pricing_tag?.name ||
                            `#${roomTypePrice.pricing_tag_id}`}
                        </div>

                        <div
                          className={`shrink-0 text-sm font-semibold ${
                            roomTypePrice.pricing_value < 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                          title={`${getPricingTypeLabel(roomTypePrice.pricing_type)} • ${getDirectionLabel(roomTypePrice.pricing_value)}`}
                        >
                          {getSignedValueLabel(
                            roomTypePrice.pricing_type,
                            roomTypePrice.pricing_value,
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(roomTypePrice.id)}
                        disabled={isBusy}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[#D1D5DB] px-2 text-xs font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <BiEditAlt className="text-sm" />
                      </button>

                      <Popconfirm
                        title={t("pricingStrategies.delete.title")}
                        description={t("pricingStrategies.delete.description")}
                        okText={t("pricingStrategies.delete.confirm")}
                        cancelText={t("actions.cancel")}
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(roomTypePrice.id)}
                        disabled={isBusy}
                      >
                        <button
                          type="button"
                          disabled={isBusy}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 px-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <BiTrashAlt className="text-sm" />
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Spin>

      <RoomTypePriceFormModal
        open={formOpen}
        mode={formMode}
        roomTypePrice={selectedPrice}
        roomTypeBasePrice={toNormalizedPositiveNumber(roomType.price)}
        pricingTagOptions={
          formMode === "create" ? availableCreateTagOptions : allTagOptions
        }
        submitting={isFormSubmitting}
        onClose={closeFormModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
