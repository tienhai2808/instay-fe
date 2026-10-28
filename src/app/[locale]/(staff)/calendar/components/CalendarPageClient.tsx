"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { Empty, Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  createPricingTag,
  deletePricingTag,
  getPricingTags,
  updatePricingTag,
} from "@/apis/pricing_tag";
import {
  getPricingCalendars,
  updatePricingCalendars,
} from "@/apis/pricing_calendar";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { PricingTag } from "@/types/data/pricing_tag";
import PricingTagPanel from "./PricingTagPanel";
import YearCalendarTabs from "./YearCalendarTabs";
import {
  areDraftMapsEqual,
  clearTagAssignments,
  getCalendarYearsFromDraft,
  getWeekStartByLocale,
  isPayloadEmpty,
  normalizePricingCalendarDraft,
  resolveStableTagColorMap,
  toUtcDateKey,
  type PricingCalendarDraft,
} from "../utils/calendar-utils";
import { buildPricingCalendarsUpdatePayload } from "../utils/calendar-utils";

const normalizePricingTag = (tag?: PricingTag | null): PricingTag | null => {
  if (!tag) return null;

  const normalizedId = Number(tag.id);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;

  const normalizedName = (tag.name || "").trim();
  if (!normalizedName) return null;

  return {
    ...tag,
    id: Math.floor(normalizedId),
    name: normalizedName,
  };
};

export default function CalendarPageClient() {
  const t = useTranslations("CalendarPage");
  const locale = useLocale();
  const messageApi = useMessage();
  const queryClient = useQueryClient();

  const [activeTagId, setActiveTagId] = useState<number | null>(null);
  const [originalByDate, setOriginalByDate] = useState<PricingCalendarDraft>(
    {},
  );
  const [draftByDate, setDraftByDate] = useState<PricingCalendarDraft>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [optimisticDeletingTagId, setOptimisticDeletingTagId] = useState<
    number | null
  >(null);

  const paintStateRef = useRef<{
    isDragging: boolean;
    pointerType: string | null;
  }>({
    isDragging: false,
    pointerType: null,
  });
  const lastPaintedDateKeyRef = useRef<string | null>(null);

  const {
    data: pricingCalendarsRes,
    isFetching: isPricingCalendarsFetching,
    error: pricingCalendarsError,
  } = useQuery({
    queryKey: queryKeys.pricingCalendars.list(),
    queryFn: async () => getPricingCalendars(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const {
    data: pricingTagsRes,
    isFetching: isPricingTagsFetching,
    error: pricingTagsError,
  } = useQuery({
    queryKey: queryKeys.pricingTags.basic(),
    queryFn: async () => getPricingTags({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const updatePricingCalendarsMutation = useMutation({
    mutationFn: async (nextDraft: PricingCalendarDraft) => {
      const payload = buildPricingCalendarsUpdatePayload(nextDraft);
      return await updatePricingCalendars(payload);
    },
  });

  const createPricingTagMutation = useMutation({
    mutationFn: async (name: string) => createPricingTag({ name }),
  });

  const updatePricingTagMutation = useMutation({
    mutationFn: async (variables: { id: number; name: string }) =>
      updatePricingTag(variables.id, { name: variables.name }),
  });

  const deletePricingTagMutation = useMutation({
    mutationFn: async (id: number) => deletePricingTag(id),
  });

  useEffect(() => {
    if (pricingCalendarsError) {
      messageApi.errorFromApi(pricingCalendarsError);
    }
  }, [messageApi, pricingCalendarsError]);

  useEffect(() => {
    if (pricingTagsError) {
      messageApi.errorFromApi(pricingTagsError);
    }
  }, [messageApi, pricingTagsError]);

  const pricingTags = useMemo(() => {
    return (pricingTagsRes?.data?.data?.pricing_tags || [])
      .map((tag) => normalizePricingTag(tag))
      .filter((tag): tag is PricingTag => Boolean(tag));
  }, [pricingTagsRes?.data?.data?.pricing_tags]);

  const normalizedCalendarDraft = useMemo(
    () =>
      normalizePricingCalendarDraft(
        pricingCalendarsRes?.data?.data?.pricing_calendars,
      ),
    [pricingCalendarsRes?.data?.data?.pricing_calendars],
  );

  const isDraftDirty = useMemo(
    () => !areDraftMapsEqual(draftByDate, originalByDate),
    [draftByDate, originalByDate],
  );

  useEffect(() => {
    if (!hasHydrated || !isDraftDirty) {
      const frameId = window.requestAnimationFrame(() => {
        setOriginalByDate(normalizedCalendarDraft);
        setDraftByDate(normalizedCalendarDraft);
        setHasHydrated(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }
  }, [hasHydrated, isDraftDirty, normalizedCalendarDraft]);

  useEffect(() => {
    if (activeTagId === null) return;

    const isActiveTagStillAvailable = pricingTags.some(
      (pricingTag) => pricingTag.id === activeTagId,
    );

    if (!isActiveTagStillAvailable) {
      const timeoutId = window.setTimeout(() => {
        setActiveTagId(null);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [activeTagId, pricingTags]);

  useEffect(() => {
    const stopDragging = () => {
      paintStateRef.current = {
        isDragging: false,
        pointerType: null,
      };
      lastPaintedDateKeyRef.current = null;
    };

    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, []);

  const availableDateKeys = useMemo(
    () => new Set(Object.keys(originalByDate)),
    [originalByDate],
  );

  const tagNameById = useMemo(() => {
    const nextTagMap: Record<number, string> = {};

    pricingTags.forEach((tag) => {
      nextTagMap[tag.id] = tag.name || `#${tag.id}`;
    });

    return nextTagMap;
  }, [pricingTags]);

  const tagColorById = useMemo(
    () => resolveStableTagColorMap(pricingTags),
    [pricingTags],
  );

  const weekStart = useMemo(() => getWeekStartByLocale(locale), [locale]);
  const localeForIntl = useMemo(
    () => (locale === "vi" ? "vi-VN" : "en-US"),
    [locale],
  );

  const todayDateKey = useMemo(
    () => toUtcDateKey(new Date().toISOString()) || undefined,
    [],
  );

  const calendarYears = useMemo(
    () => getCalendarYearsFromDraft(originalByDate, new Date().getFullYear()),
    [originalByDate],
  );

  const updatePayload = useMemo(
    () => buildPricingCalendarsUpdatePayload(draftByDate),
    [draftByDate],
  );

  const hasEmptyPayload = useMemo(
    () => isPayloadEmpty(updatePayload),
    [updatePayload],
  );

  const canSave =
    !updatePricingCalendarsMutation.isPending &&
    isDraftDirty &&
    !hasEmptyPayload;

  const tagPanelLabels = useMemo(
    () => ({
      title: t("tags.title"),
      activeTool: t("tags.activeTool"),
      clearTool: t("tags.clearTool"),
      addButton: t("actions.addTag"),
      addPlaceholder: t("tags.addPlaceholder"),
      editPlaceholder: t("tags.editPlaceholder"),
      empty: t("tags.empty"),
      save: t("actions.save"),
      cancel: t("actions.cancel"),
      edit: t("actions.edit"),
      delete: t("actions.delete"),
      deleteTitle: t("tags.delete.title"),
      deleteDescription: t("tags.delete.description"),
      deleteConfirm: t("tags.delete.confirm"),
    }),
    [t],
  );

  const calendarLabels = useMemo(
    () => ({
      today: t("calendar.today"),
      noTag: t("calendar.noTag"),
      outsideMonth: t("calendar.outsideMonth"),
      paintRow: t("actions.paintRow"),
      paintColumn: t("actions.paintColumn"),
      monthEmpty: t("calendar.monthEmpty"),
    }),
    [t],
  );

  const applyActiveToolToDateKeys = useCallback(
    (dateKeys: string[]) => {
      if (dateKeys.length === 0) return;

      const normalizedDateKeys = dateKeys.filter((dateKey) =>
        availableDateKeys.has(dateKey),
      );

      if (normalizedDateKeys.length === 0) return;

      setDraftByDate((currentDraft) => {
        let hasChanges = false;
        const nextDraft: PricingCalendarDraft = { ...currentDraft };

        normalizedDateKeys.forEach((dateKey) => {
          if (!(dateKey in nextDraft)) return;

          const currentValue = nextDraft[dateKey] ?? null;
          if (currentValue === activeTagId) return;

          nextDraft[dateKey] = activeTagId;
          hasChanges = true;
        });

        return hasChanges ? nextDraft : currentDraft;
      });
    },
    [activeTagId, availableDateKeys],
  );

  const handleDatePointerDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>, dateKey: string) => {
      if (event.pointerType === "touch") {
        lastPaintedDateKeyRef.current = dateKey;
        applyActiveToolToDateKeys([dateKey]);
        return;
      }

      event.preventDefault();
      paintStateRef.current = {
        isDragging: true,
        pointerType: event.pointerType,
      };
      lastPaintedDateKeyRef.current = dateKey;

      applyActiveToolToDateKeys([dateKey]);
    },
    [applyActiveToolToDateKeys],
  );

  const handleDatePointerEnter = useCallback(
    (dateKey: string) => {
      if (!paintStateRef.current.isDragging) return;
      if (paintStateRef.current.pointerType === "touch") return;
      if (lastPaintedDateKeyRef.current === dateKey) return;

      lastPaintedDateKeyRef.current = dateKey;

      applyActiveToolToDateKeys([dateKey]);
    },
    [applyActiveToolToDateKeys],
  );

  const handleCreateTag = async (name: string) => {
    try {
      const response = await createPricingTagMutation.mutateAsync(name);
      messageApi.fromApi(response.data, "success");

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pricingTags.all,
      });

      const createdTag = normalizePricingTag(response.data.data?.pricing_tag);
      if (createdTag) {
        setActiveTagId(createdTag.id);
        return createdTag;
      }

      const latestTagsRes = await queryClient.fetchQuery({
        queryKey: queryKeys.pricingTags.basic(),
        queryFn: async () => await getPricingTags({ view: "basic" }),
      });

      const normalizedTags = (latestTagsRes.data.data.pricing_tags || [])
        .map((tag) => normalizePricingTag(tag))
        .filter((tag): tag is PricingTag => Boolean(tag));

      const normalizedName = name.trim().toLocaleLowerCase();
      const matchedTag =
        normalizedTags.find(
          (tag) => tag.name.trim().toLocaleLowerCase() === normalizedName,
        ) || null;

      if (matchedTag) {
        setActiveTagId(matchedTag.id);
      }

      return matchedTag;
    } catch (error) {
      messageApi.errorFromApi(error);
      return null;
    }
  };

  const handleUpdateTag = async (id: number, name: string) => {
    try {
      const response = await updatePricingTagMutation.mutateAsync({ id, name });
      messageApi.fromApi(response.data, "success");

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pricingTags.all,
      });
      return true;
    } catch (error) {
      messageApi.errorFromApi(error);
      return false;
    }
  };

  const handleDeleteTag = async (id: number) => {
    const previousDraft = draftByDate;

    try {
      setOptimisticDeletingTagId(id);
      setDraftByDate((currentDraft) => clearTagAssignments(currentDraft, id));
      if (activeTagId === id) {
        setActiveTagId(null);
      }

      const response = await deletePricingTagMutation.mutateAsync(id);
      messageApi.fromApi(response.data, "success");

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pricingTags.all,
      });
      return true;
    } catch (error) {
      setDraftByDate(previousDraft);
      messageApi.errorFromApi(error);
      return false;
    } finally {
      setOptimisticDeletingTagId(null);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;

    const nextDraft = { ...draftByDate };

    try {
      const response =
        await updatePricingCalendarsMutation.mutateAsync(nextDraft);
      messageApi.fromApi(response.data, "success");

      setOriginalByDate(nextDraft);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pricingCalendars.all,
      });
    } catch (error) {
      messageApi.errorFromApi(error);
    }
  };

  const handleReset = () => {
    setDraftByDate({ ...originalByDate });
  };

  const isTagMutationPending =
    createPricingTagMutation.isPending ||
    updatePricingTagMutation.isPending ||
    deletePricingTagMutation.isPending;

  const disableCalendarInteraction =
    updatePricingCalendarsMutation.isPending ||
    optimisticDeletingTagId !== null;

  const showInitialLoading =
    !hasHydrated && (isPricingCalendarsFetching || isPricingTagsFetching);

  return (
    <div className="flex h-full flex-col gap-4 pb-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{t("title")}</h1>
          <p className="text-sm text-[#6b7280]">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={
                !isDraftDirty || updatePricingCalendarsMutation.isPending
              }
              className="inline-flex w-full items-center justify-center rounded-md border border-[#d1d5dc] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.reset")}
            </button>

            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={!canSave}
              className="inline-flex w-full items-center justify-center rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {updatePricingCalendarsMutation.isPending
                ? t("actions.updating")
                : t("actions.update")}
            </button>
          </div>

          <p
            className={`text-xs ${
              isDraftDirty ? "text-[#d97706]" : "text-[#16a34a]"
            }`}
          >
            {isDraftDirty ? t("status.dirty") : t("status.synced")}
          </p>

          {isDraftDirty && hasEmptyPayload ? (
            <p className="text-xs text-[#dc2626]">{t("status.emptyPayload")}</p>
          ) : null}
        </div>
      </div>

      <PricingTagPanel
        tags={pricingTags}
        activeTagId={activeTagId}
        tagColorById={tagColorById}
        loading={isPricingTagsFetching || isTagMutationPending}
        labels={tagPanelLabels}
        onSelectTag={(tagId) => setActiveTagId(tagId)}
        onSelectClear={() => setActiveTagId(null)}
        onCreateTag={handleCreateTag}
        onUpdateTag={handleUpdateTag}
        onDeleteTag={handleDeleteTag}
      />

      {showInitialLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#e5e7eb] bg-white">
          <Spin size="large" />
        </div>
      ) : availableDateKeys.size === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-[#e5e7eb] bg-white">
          <Empty description={t("empty.calendar")} />
        </div>
      ) : (
        <Spin spinning={isPricingCalendarsFetching && hasHydrated}>
          <YearCalendarTabs
            years={calendarYears}
            locale={localeForIntl}
            weekStart={weekStart}
            draftByDate={draftByDate}
            availableDateKeys={availableDateKeys}
            tagNameById={tagNameById}
            tagColorById={tagColorById}
            activeTagId={activeTagId}
            todayDateKey={todayDateKey}
            disabledInteractions={disableCalendarInteraction}
            labels={calendarLabels}
            onDatePointerDown={handleDatePointerDown}
            onDatePointerEnter={handleDatePointerEnter}
            onPaintDates={applyActiveToolToDateKeys}
          />
        </Spin>
      )}
    </div>
  );
}
