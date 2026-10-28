"use client";

import { useEffect, useMemo, useState } from "react";
import { Spin } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BsChevronLeft } from "react-icons/bs";
import type { Dayjs } from "dayjs";
import { createBooking } from "@/apis/booking";
import { getBasicBranches } from "@/apis/branch";
import { createBookingRoom } from "@/apis/booking_room";
import { getRoomTypes } from "@/apis/room_type";
import {
  createSource,
  deleteSource,
  getSources,
  updateSource,
} from "@/apis/source";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { BasicBranch } from "@/types/data/branch";
import type { Source } from "@/types/data/source";
import type { CreateBookingRequest } from "@/types/request/booking";
import type { GetRoomTypesRequest } from "@/types/request/room_type";
import BookingForm, { type BookingFormSubmitPayload } from "../components/Form";

const normalizeSource = (source: Source): Source => ({
  ...source,
  id: String(source.id),
});

const normalizeBranch = (branch: BasicBranch): BasicBranch => ({
  ...branch,
  id: String(branch.id),
});

const normalizeOptionalString = (value?: string | null) => {
  const nextValue = value?.trim();
  return nextValue || undefined;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const toApiDateTime = (date: Date) => {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());

  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const sign = timezoneOffsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(timezoneOffsetMinutes);
  const offsetHour = pad2(Math.floor(absoluteOffset / 60));
  const offsetMinute = pad2(absoluteOffset % 60);

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHour}:${offsetMinute}`;
};

const toApiHourDateTime = (value?: Dayjs) => {
  if (!value) return "";
  const date = value.toDate();
  date.setMinutes(0, 0, 0);
  return toApiDateTime(date);
};

const isSourceShape = (value: unknown): value is Source => {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value
  );
};

const extractCreatedSource = (payload: unknown): Source | null => {
  if (isSourceShape(payload)) return normalizeSource(payload);

  if (typeof payload === "object" && payload !== null && "source" in payload) {
    const source = (payload as { source?: unknown }).source;
    if (isSourceShape(source)) return normalizeSource(source);
  }

  return null;
};

const extractBookingIdFromPayload = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") return null;

  const directId = (payload as { id?: unknown }).id;
  if (typeof directId === "string" && directId.trim()) return directId.trim();
  if (typeof directId === "number") return String(directId);

  return null;
};

export default function CreateBookingPage() {
  const t = useTranslations("BookingsPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const [branchId, setBranchId] = useState<string>();
  const selectedRoomId = useMemo(
    () => normalizeOptionalString(searchParams.get("room_id")),
    [searchParams],
  );
  const roomTypeParams = useMemo<GetRoomTypesRequest>(
    () => ({
      view: "basic",
      branch_id: branchId || undefined,
    }),
    [branchId],
  );

  const {
    data: roomTypesRes,
    isFetching: loadingRoomTypes,
    error: roomTypesError,
  } = useQuery({
    queryKey: queryKeys.roomTypes.list(roomTypeParams),
    queryFn: async () => getRoomTypes(roomTypeParams),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: branchesRes,
    isFetching: loadingBranches,
    error: branchesError,
  } = useQuery({
    queryKey: queryKeys.branches.basic(),
    queryFn: async () => getBasicBranches(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: sourcesRes,
    isFetching: loadingSources,
    error: sourcesError,
  } = useQuery({
    queryKey: queryKeys.sources.basic(),
    queryFn: async () => getSources({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (roomTypesError) {
      messageApi.errorFromApi(roomTypesError);
    }
  }, [messageApi, roomTypesError]);

  useEffect(() => {
    if (branchesError) {
      messageApi.errorFromApi(branchesError);
    }
  }, [branchesError, messageApi]);

  useEffect(() => {
    if (sourcesError) {
      messageApi.errorFromApi(sourcesError);
    }
  }, [messageApi, sourcesError]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateBookingRequest) => createBooking(payload),
  });

  const createBookingRoomMutation = useMutation({
    mutationFn: async (payload: { booking_id: string; room_id: string }) =>
      createBookingRoom(payload),
  });

  const createSourceMutation = useMutation({
    mutationFn: async (name: string) => createSource({ name }),
  });

  const updateSourceMutation = useMutation({
    mutationFn: async (variables: { id: string; name: string }) =>
      updateSource(variables.id, { name: variables.name }),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => deleteSource(id),
  });

  const roomTypeOptions = useMemo(
    () =>
      (roomTypesRes?.data?.data?.room_types || []).map((roomType) => ({
        value: String(roomType.id),
        label: roomType.name || `#${roomType.id}`,
      })),
    [roomTypesRes?.data?.data?.room_types],
  );

  const branchOptions = useMemo(
    () =>
      (branchesRes?.data?.data?.branches || []).map((branch) => {
        const normalizedBranch = normalizeBranch(branch);
        return {
          value: normalizedBranch.id,
          label: normalizedBranch.name || `#${normalizedBranch.id}`,
        };
      }),
    [branchesRes?.data?.data?.branches],
  );

  const sources = useMemo(
    () => (sourcesRes?.data?.data?.sources || []).map(normalizeSource),
    [sourcesRes?.data?.data?.sources],
  );

  const submitting =
    createMutation.isPending ||
    createBookingRoomMutation.isPending ||
    createSourceMutation.isPending ||
    updateSourceMutation.isPending ||
    deleteSourceMutation.isPending;

  const handleCancel = () => {
    router.push("/bookings");
  };

  const handleCreateSource = async (name: string) => {
    try {
      const res = await createSourceMutation.mutateAsync(name);
      messageApi.fromApi(res.data, "success");

      await queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });

      const createdSource = extractCreatedSource(res.data.data);
      if (createdSource) {
        return createdSource;
      }

      const latestSourcesRes = await queryClient.fetchQuery({
        queryKey: queryKeys.sources.basic(),
        queryFn: async () => getSources({ view: "basic" }),
      });
      const latestSources = (latestSourcesRes.data.data.sources || []).map(
        normalizeSource,
      );
      return latestSources.find((source) => source.name === name) || null;
    } catch (error) {
      messageApi.errorFromApi(error);
      return null;
    }
  };

  const handleUpdateSource = async (id: string, name: string) => {
    try {
      const res = await updateSourceMutation.mutateAsync({ id, name });
      messageApi.fromApi(res.data, "success");

      await queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      return true;
    } catch (error) {
      messageApi.errorFromApi(error);
      return false;
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const res = await deleteSourceMutation.mutateAsync(id);
      messageApi.fromApi(res.data, "success");

      await queryClient.invalidateQueries({ queryKey: queryKeys.sources.all });
      return true;
    } catch (error) {
      messageApi.errorFromApi(error);
      return false;
    }
  };

  const handleCreate = async ({
    values,
    guest_number,
    isOfflineSource,
  }: BookingFormSubmitPayload) => {
    const payload: CreateBookingRequest = {
      ...(isOfflineSource
        ? {}
        : {
            booking_number: normalizeOptionalString(values.booking_number),
          }),
      guest_full_name: values.guest_full_name.trim(),
      guest_email: values.guest_email.trim(),
      guest_phone: values.guest_phone.trim(),
      check_in: toApiHourDateTime(values.check_in),
      check_out: toApiHourDateTime(values.check_out),
      room_type_id: values.room_type_id || "",
      ...(values.branch_id ? { branch_id: values.branch_id } : {}),
      room_number: Number(values.room_number || 0),
      guest_number,
      source_id: values.source_id || "",
      ...(!isOfflineSource
        ? {
            total_sell_price: Number(values.total_sell_price || 0),
          }
        : {}),
      ...(!isOfflineSource &&
      values.total_net_price != null &&
      values.total_net_price > 0
        ? {
            total_net_price: Number(values.total_net_price),
          }
        : {}),
      ...(normalizeOptionalString(values.promotion_name)
        ? {
            promotion_name: normalizeOptionalString(values.promotion_name),
          }
        : {}),
      ...(normalizeOptionalString(values.meal_plan)
        ? {
            meal_plan: normalizeOptionalString(values.meal_plan),
          }
        : {}),
      ...(normalizeOptionalString(values.booking_preferences)
        ? {
            booking_preferences: normalizeOptionalString(
              values.booking_preferences,
            ),
          }
        : {}),
      ...(normalizeOptionalString(values.booking_conditions)
        ? {
            booking_conditions: normalizeOptionalString(
              values.booking_conditions,
            ),
          }
        : {}),
      ...(normalizeOptionalString(values.note)
        ? {
            note: normalizeOptionalString(values.note),
          }
        : {}),
    };

    try {
      const createBookingRes = await createMutation.mutateAsync(payload);
      const createdId = extractBookingIdFromPayload(createBookingRes.data.data);

      if (createdId && selectedRoomId) {
        try {
          const createBookingRoomRes =
            await createBookingRoomMutation.mutateAsync({
              booking_id: createdId,
              room_id: selectedRoomId,
            });
          messageApi.fromApi(createBookingRoomRes.data, "success");
        } catch {
          messageApi.fromApi(createBookingRes.data, "success");
        }
      } else {
        messageApi.fromApi(createBookingRes.data, "success");
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });

      if (createdId) {
        router.push(`/bookings/${createdId}`);
        return;
      }

      router.push("/bookings");
    } catch (error) {
      messageApi.errorFromApi(error);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex justify-between items-start text-black">
        <div>
          <Link
            href="/bookings"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("createPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("createPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin
          spinning={loadingRoomTypes || loadingBranches || loadingSources}
          size="large"
        >
          <BookingForm
            mode="create"
            submitting={submitting}
            roomTypeOptions={roomTypeOptions}
            branchOptions={branchOptions}
            sources={sources}
            onCancel={handleCancel}
            onBranchChange={setBranchId}
            onSubmit={handleCreate}
            onCreateSource={handleCreateSource}
            onUpdateSource={handleUpdateSource}
            onDeleteSource={handleDeleteSource}
          />
        </Spin>
      </div>
    </div>
  );
}
