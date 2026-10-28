"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Select, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BsChevronLeft, BsQrCode } from "react-icons/bs";
import { BiEditAlt, BiPlus } from "react-icons/bi";
import { RiRobot2Line } from "react-icons/ri";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteBooking,
  getBookingById,
  updateBooking,
  updateBookingStatus,
} from "@/apis/booking";
import { getBasicBranches } from "@/apis/branch";
import { createBookingRoom, updateBookingRoom } from "@/apis/booking_room";
import { getRoomTypes, getRoomsByRoomTypeId } from "@/apis/room_type";
import {
  createSource,
  deleteSource,
  getSources,
  updateSource,
} from "@/apis/source";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { BasicBranch } from "@/types/data/branch";
import type { Booking, SimpleBookingRoomResponse } from "@/types/data/booking";
import type { SimpleRoomResponse } from "@/types/data/room";
import type { Source } from "@/types/data/source";
import type {
  BookingStatus,
  UpdateBookingRequest,
} from "@/types/request/booking";
import type { GetRoomTypesRequest } from "@/types/request/room_type";
import {
  canManageGuests,
  canManageOrderServices,
  canManageSupportTickets,
  createAuthzSnapshot,
  isAdminSnapshot,
} from "@/utils/access-control";
import BookingForm, {
  type BookingFormSubmitPayload,
  type BookingFormValues,
  type RoomTypeOption,
  isOfflineSourceName,
} from "../components/Form";
import BookingPredictModal from "../components/BookingPredictModal";
import BookingRoomDetailsModal from "../components/BookingRoomDetailsModal";
import BookingRoomQrModal from "../components/BookingRoomQrModal";
import type { BookingRoomDetailsTabKey } from "../components/BookingRoomDetailsTabs";

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

const getBookingFromResponse = (payload: unknown): Booking | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "booking" in record && record.booking && typeof record.booking === "object"
      ? record.booking
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const booking = candidate as Booking;
  if (!booking.id) return null;

  return {
    ...booking,
    id: String(booking.id),
  };
};

const normalizeBookingRooms = (rooms?: Booking["booking_rooms"]) => {
  if (!Array.isArray(rooms)) return [];

  return rooms
    .map((bookingRoom) => {
      if (!bookingRoom?.id) return null;

      return {
        ...bookingRoom,
        id: String(bookingRoom.id),
        room: bookingRoom.room?.id
          ? {
              ...bookingRoom.room,
              id: String(bookingRoom.room.id),
            }
          : bookingRoom.room,
      } as SimpleBookingRoomResponse;
    })
    .filter((bookingRoom): bookingRoom is SimpleBookingRoomResponse =>
      Boolean(bookingRoom),
    );
};

const getRoomListFromResponse = (payload: unknown): SimpleRoomResponse[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((room) => {
        if (!room || typeof room !== "object") return null;
        const roomRecord = room as Record<string, unknown>;
        const id = roomRecord.id;
        const name = roomRecord.name;

        if (
          (typeof id !== "string" && typeof id !== "number") ||
          typeof name !== "string"
        ) {
          return null;
        }

        return {
          id: String(id),
          name,
          is_available: Boolean(roomRecord.is_available),
        } as SimpleRoomResponse;
      })
      .filter((room): room is SimpleRoomResponse => Boolean(room));
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.rooms)) {
      return getRoomListFromResponse(record.rooms);
    }
  }

  return [];
};

const normalizeGuestType = (type?: string | null) => {
  const normalized = (type || "").trim().toLocaleLowerCase();
  if (!normalized) return undefined;

  if (
    normalized === "adult" ||
    normalized === "adults" ||
    normalized === "người lớn" ||
    normalized === "nguoi lon"
  ) {
    return "adults";
  }

  if (
    normalized === "child" ||
    normalized === "children" ||
    normalized === "trẻ em" ||
    normalized === "tre em"
  ) {
    return "children";
  }

  if (
    normalized === "infant" ||
    normalized === "infants" ||
    normalized === "em bé" ||
    normalized === "em be"
  ) {
    return "infants";
  }

  return undefined;
};

const parseGuestSegments = (
  guestNumber?: string,
): BookingFormValues["guest_segments"] => {
  if (!guestNumber) {
    return [{ count: 1, type: "adults" }];
  }

  const segments = guestNumber
    .split(",")
    .map((segment) => segment.trim())
    .map((segment) => {
      const match = segment.match(/^(\d+)\s+(.+)$/i);
      if (!match) return null;

      const count = Number(match[1]);
      const mappedType = normalizeGuestType(match[2]);
      if (!count || !mappedType) return null;

      return {
        count,
        type: mappedType,
      };
    })
    .filter((segment): segment is { count: number; type: string } =>
      Boolean(segment),
    );

  if (!segments.length) {
    return [{ count: 1, type: "adults" }];
  }

  return segments;
};

const toDayjs = (value?: string) => {
  if (!value) return undefined;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return undefined;
  return parsed;
};

export default function BookingDetailsPage() {
  const t = useTranslations("BookingsPage");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const authzSnapshot = useMemo(() => createAuthzSnapshot(user), [user]);
  const isAdmin = isAdminSnapshot(authzSnapshot);

  const [isSelectRoomOpen, setIsSelectRoomOpen] = useState(false);
  const [isChangeRoomOpen, setIsChangeRoomOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState(false);
  const [isPredictModalOpen, setIsPredictModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedBookingRoomId, setSelectedBookingRoomId] = useState<
    string | undefined
  >();
  const [nextRoomId, setNextRoomId] = useState<string | undefined>();
  const [qrBookingRoom, setQrBookingRoom] =
    useState<SimpleBookingRoomResponse | null>(null);
  const [detailsBookingRoom, setDetailsBookingRoom] =
    useState<SimpleBookingRoomResponse | null>(null);
  const [detailsInitialTab, setDetailsInitialTab] =
    useState<BookingRoomDetailsTabKey>("review");
  const [branchFilterOverride, setBranchFilterOverride] = useState<
    string | null
  >();

  const bookingId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0];
    return rawId;
  }, [params]);

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

  const {
    data: bookingRes,
    isFetching: loadingBooking,
    error: bookingError,
  } = useQuery({
    queryKey: queryKeys.bookings.detail(bookingId || ""),
    queryFn: async () => getBookingById(bookingId as string),
    enabled: Boolean(bookingId),
  });

  const booking = useMemo(
    () => getBookingFromResponse(bookingRes?.data?.data),
    [bookingRes?.data?.data],
  );

  const bookingBranchId = booking?.branch?.id
    ? String(booking.branch.id)
    : undefined;
  const activeBranchId =
    branchFilterOverride === undefined
      ? bookingBranchId
      : branchFilterOverride || undefined;
  const roomTypeParams = useMemo<GetRoomTypesRequest>(
    () => ({
      view: "basic",
      branch_id: activeBranchId,
    }),
    [activeBranchId],
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

  const bookingRooms = useMemo(
    () => normalizeBookingRooms(booking?.booking_rooms),
    [booking?.booking_rooms],
  );

  const roomTypeId = booking?.room_type?.id
    ? String(booking.room_type.id)
    : undefined;

  const roomTypeRoomsQueryKey = useMemo(
    () => ["room-types", "rooms", roomTypeId || ""] as const,
    [roomTypeId],
  );

  const {
    data: roomTypeRoomsRes,
    isFetching: loadingRoomTypeRooms,
    error: roomTypeRoomsError,
  } = useQuery({
    queryKey: roomTypeRoomsQueryKey,
    queryFn: async () => getRoomsByRoomTypeId(roomTypeId as string),
    enabled: Boolean(roomTypeId),
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

  useEffect(() => {
    if (bookingError) {
      messageApi.errorFromApi(bookingError);
    }
  }, [bookingError, messageApi]);

  useEffect(() => {
    if (roomTypeRoomsError) {
      messageApi.errorFromApi(roomTypeRoomsError);
    }
  }, [messageApi, roomTypeRoomsError]);

  useEffect(() => {
    if (!bookingId) return;
    if (loadingBooking) return;
    if (bookingError) return;
    if (booking) return;

    messageApi.error(t("detailPage.errors.notFound"));
    router.replace("/bookings");
  }, [booking, bookingError, bookingId, loadingBooking, messageApi, router, t]);

  const updateMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: UpdateBookingRequest;
    }) => updateBooking(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.bookings.detail(bookingId || ""),
        }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: { id: string; status: BookingStatus }) =>
      updateBookingStatus(variables.id, { status: variables.status }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.bookings.detail(bookingId || ""),
        }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => deleteBooking(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");

      await queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      router.replace("/bookings");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
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

  const createBookingRoomMutation = useMutation({
    mutationFn: async (payload: { booking_id: string; room_id: string }) =>
      createBookingRoom(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setIsSelectRoomOpen(false);
      setSelectedRoomId(undefined);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.bookings.detail(bookingId || ""),
        }),
        queryClient.invalidateQueries({ queryKey: roomTypeRoomsQueryKey }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateBookingRoomMutation = useMutation({
    mutationFn: async (payload: { id: string; room_id: string }) =>
      updateBookingRoom(payload.id, { room_id: payload.room_id }),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setIsChangeRoomOpen(false);
      setSelectedBookingRoomId(undefined);
      setNextRoomId(undefined);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.bookings.detail(bookingId || ""),
        }),
        queryClient.invalidateQueries({ queryKey: roomTypeRoomsQueryKey }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const roomTypeOptions = useMemo<RoomTypeOption[]>(
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

  const roomTypeRooms = useMemo(
    () => getRoomListFromResponse(roomTypeRoomsRes?.data?.data),
    [roomTypeRoomsRes?.data?.data],
  );

  const availableRooms = useMemo(
    () => roomTypeRooms.filter((room) => room.is_available),
    [roomTypeRooms],
  );

  const persistedRoomIds = useMemo(
    () =>
      new Set(
        bookingRooms
          .map((bookingRoom) => bookingRoom.room?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    [bookingRooms],
  );

  const selectedRoomIds = persistedRoomIds;

  const canSelectMoreRooms = useMemo(() => {
    const roomNumberValue = Number(booking?.room_number || 0);
    if (!Number.isFinite(roomNumberValue) || roomNumberValue <= 0) return false;
    return bookingRooms.length < roomNumberValue;
  }, [booking?.room_number, bookingRooms.length]);

  const selectableRoomsForCreate = useMemo(
    () =>
      availableRooms.filter((room) => {
        return !selectedRoomIds.has(String(room.id));
      }),
    [availableRooms, selectedRoomIds],
  );

  const activeBookingRoomId = selectedBookingRoomId || bookingRooms[0]?.id;

  const selectedBookingRoom = useMemo(
    () => bookingRooms.find((room) => room.id === activeBookingRoomId),
    [activeBookingRoomId, bookingRooms],
  );

  const selectableRoomsForChange = useMemo(() => {
    if (!activeBookingRoomId) return availableRooms;

    const blockedRoomIds = new Set(
      bookingRooms
        .filter((bookingRoom) => bookingRoom.id !== activeBookingRoomId)
        .map((bookingRoom) => bookingRoom.room?.id)
        .filter((id): id is string => Boolean(id)),
    );

    return availableRooms.filter(
      (room) => !blockedRoomIds.has(String(room.id)),
    );
  }, [activeBookingRoomId, availableRooms, bookingRooms]);

  const initialValues = useMemo<Partial<BookingFormValues> | undefined>(() => {
    if (!booking) return undefined;

    return {
      booking_number: booking.booking_number || "",
      guest_full_name: booking.guest_full_name || "",
      guest_email: booking.guest_email || "",
      guest_phone: booking.guest_phone || "",
      check_in: toDayjs(booking.check_in),
      check_out: toDayjs(booking.check_out),
      branch_id: booking.branch?.id ? String(booking.branch.id) : undefined,
      room_type_id: booking.room_type?.id
        ? String(booking.room_type.id)
        : undefined,
      room_number:
        booking.room_number != null ? Number(booking.room_number) : undefined,
      guest_segments: parseGuestSegments(booking.guest_number),
      total_net_price:
        typeof booking.total_net_price === "number"
          ? booking.total_net_price
          : undefined,
      total_sell_price:
        typeof booking.total_sell_price === "number"
          ? booking.total_sell_price
          : undefined,
      promotion_name: booking.promotion_name || "",
      meal_plan: booking.meal_plan || "",
      booking_preferences: booking.booking_preferences || "",
      booking_conditions: booking.booking_conditions || "",
      note: booking.note || "",
      status: booking.status || "confirmed",
      source_id: booking.source?.id ? String(booking.source.id) : undefined,
    };
  }, [booking]);

  const isOfflineSource = useMemo(
    () => isOfflineSourceName(booking?.source?.name),
    [booking?.source?.name],
  );

  const bookingStatus = booking?.status;
  const isConfirmedStatus = bookingStatus === "confirmed";
  const canSelectRooms = bookingStatus === "confirmed";
  const canEditBooking = isOfflineSource && canSelectRooms;
  const canDeleteBooking =
    isOfflineSource &&
    bookingStatus !== "checked-in" &&
    bookingStatus !== "checked-out";
  const canAccessStayTab = isAdmin || canManageGuests(authzSnapshot);
  const canAccessServicesTab = isAdmin || canManageOrderServices(authzSnapshot);
  const canAccessSupportTab = isAdmin || canManageSupportTickets(authzSnapshot);

  const roomDetailActions = useMemo(() => {
    const actions: Array<{
      key: BookingRoomDetailsTabKey;
      label: string;
      className: string;
    }> = [];

    if (canAccessStayTab) {
      actions.push({
        key: "stay",
        label: t("detailPage.bookingRoomDetailsModal.tabs.stay"),
        className:
          "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3] hover:border-[#a5b4fc] hover:bg-[#e0e7ff]",
      });
    }

    if (canAccessServicesTab) {
      actions.push({
        key: "services",
        label: t("detailPage.bookingRoomDetailsModal.tabs.services"),
        className:
          "border-[#bae6fd] bg-[#ecfeff] text-[#0c4a6e] hover:border-[#7dd3fc] hover:bg-[#cffafe]",
      });
    }

    if (canAccessSupportTab) {
      actions.push({
        key: "support",
        label: t("detailPage.bookingRoomDetailsModal.tabs.support"),
        className:
          "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412] hover:border-[#fdba74] hover:bg-[#ffedd5]",
      });
    }

    actions.push({
      key: "review",
      label: t("detailPage.bookingRoomDetailsModal.tabs.review"),
      className:
        "border-[#d1d5db] bg-[#f9fafb] text-[#374151] hover:border-[#9ca3af] hover:bg-[#f3f4f6]",
    });

    return actions;
  }, [canAccessServicesTab, canAccessStayTab, canAccessSupportTab, t]);

  const submitting =
    updateMutation.isPending ||
    deleteBookingMutation.isPending ||
    createSourceMutation.isPending ||
    updateSourceMutation.isPending ||
    deleteSourceMutation.isPending;

  const loading =
    loadingRoomTypes ||
    loadingBranches ||
    loadingSources ||
    loadingBooking ||
    loadingRoomTypeRooms;

  const bookingRoomOptions = useMemo(
    () =>
      bookingRooms.map((bookingRoom, index) => ({
        value: bookingRoom.id,
        label: `${t("detailPage.roomSection.room")} ${index + 1}: ${bookingRoom.room?.name || `#${bookingRoom.room?.id || bookingRoom.id}`}`,
      })),
    [bookingRooms, t],
  );

  const createRoomOptions = useMemo(
    () =>
      selectableRoomsForCreate.map((room) => ({
        value: String(room.id),
        label: room.name || `#${room.id}`,
      })),
    [selectableRoomsForCreate],
  );

  const changeRoomOptions = useMemo(
    () =>
      selectableRoomsForChange.map((room) => ({
        value: String(room.id),
        label: room.name || `#${room.id}`,
      })),
    [selectableRoomsForChange],
  );

  const effectiveNextRoomId =
    nextRoomId &&
    changeRoomOptions.some((option) => option.value === nextRoomId)
      ? nextRoomId
      : changeRoomOptions[0]?.value;

  const nextStatusTargets = useMemo<BookingStatus[]>(() => {
    if (bookingStatus === "confirmed") return ["checked-in", "cancelled"];
    if (bookingStatus === "checked-in") return ["checked-out"];
    return [];
  }, [bookingStatus]);

  const requiredRoomCount = Number(booking?.room_number || 0);
  const canCheckIn =
    requiredRoomCount > 0 && bookingRooms.length === requiredRoomCount;

  const handleCancel = () => {
    router.push("/bookings");
  };

  const handleUpdateStatus = (status: BookingStatus) => {
    if (!bookingId) return;
    if (!nextStatusTargets.includes(status)) return;

    updateStatusMutation.mutate({ id: bookingId, status });
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

  const handleUpdateBooking = async ({
    values,
    guest_number,
  }: BookingFormSubmitPayload) => {
    if (!canEditBooking) return;
    if (!bookingId) return;

    const payload: UpdateBookingRequest = {
      guest_full_name: values.guest_full_name.trim(),
      guest_email: values.guest_email.trim(),
      guest_phone: values.guest_phone.trim(),
      check_in: toApiHourDateTime(values.check_in),
      check_out: toApiHourDateTime(values.check_out),
      room_type_id: values.room_type_id || "",
      ...(values.branch_id ? { branch_id: values.branch_id } : {}),
      room_number: Number(values.room_number || 0),
      guest_number,
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

    updateMutation.mutate({ id: bookingId, payload });
  };

  const handleDeleteBooking = () => {
    if (!bookingId || !canDeleteBooking) return;

    messageApi.customToast({
      type: "warning",
      content: `${t("detailPage.deleteModal.title")} ${t("detailPage.deleteModal.description")}`,
      actionLabel: t("detailPage.deleteModal.confirm"),
      autoCloseMs: null,
      onAction: () => {
        void deleteBookingMutation.mutateAsync(bookingId);
      },
    });
  };

  const handleOpenSelectRoom = () => {
    if (!canSelectRooms) return;
    setSelectedRoomId(selectableRoomsForCreate[0]?.id);
    setIsSelectRoomOpen(true);
  };

  const handleOpenChangeRoom = () => {
    if (!canSelectRooms) return;
    const firstBookingRoom = bookingRooms[0];
    setSelectedBookingRoomId(firstBookingRoom?.id);
    setNextRoomId(undefined);
    setIsChangeRoomOpen(true);
  };

  const handleSelectRoom = () => {
    if (!canSelectRooms) return;
    if (!bookingId || !selectedRoomId) return;
    if (selectedRoomIds.has(selectedRoomId)) return;
    if (!canSelectMoreRooms) return;

    createBookingRoomMutation.mutate({
      booking_id: bookingId,
      room_id: selectedRoomId,
    });
  };

  const handleChangeRoom = async () => {
    if (!canSelectRooms) return;
    if (!activeBookingRoomId || !effectiveNextRoomId) return;

    updateBookingRoomMutation.mutate({
      id: activeBookingRoomId,
      room_id: effectiveNextRoomId,
    });
  };

  const handleOpenBookingRoomDetails = (
    bookingRoom: SimpleBookingRoomResponse,
    initialTab: BookingRoomDetailsTabKey,
  ) => {
    setDetailsInitialTab(initialTab);
    setDetailsBookingRoom(bookingRoom);
    setIsRoomDetailsOpen(true);
  };

  const totalDisplayedRooms = bookingRooms.length;

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("detailPage.back")}
          </button>
          <h1 className="text-xl font-bold">{t("detailPage.title")}</h1>
        </div>

        {canSelectRooms && (
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPredictModalOpen(true)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-[#c7d2fe] bg-[#eef2ff] px-3 py-2 text-sm font-medium text-[#4338ca] transition hover:border-[#a5b4fc] hover:bg-[#e0e7ff] sm:w-auto"
            >
              <RiRobot2Line className="text-base" />
              {t("predict.button")}
            </button>

            {canSelectMoreRooms && (
              <button
                type="button"
                onClick={handleOpenSelectRoom}
                disabled={
                  loading ||
                  createBookingRoomMutation.isPending ||
                  !createRoomOptions.length
                }
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] active:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <BiPlus className="text-base" />
                {t("detailPage.actions.selectRoom")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loading} size="large">
          {!canEditBooking && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {!isOfflineSource
                ? t("detailPage.locked.byOfflineSource")
                : t("detailPage.locked.byStatus")}
            </div>
          )}

          <div className="mb-2 flex flex-col rounded-xl bg-[#f5f5f5] p-4 shadow-sm md:p-6">
            <div className="flex flex-col gap-0 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm mb-4 font-semibold tracking-wide text-black">
                {t("detailPage.roomSection.title")}
              </h2>

              {canSelectRooms && bookingRooms.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenChangeRoom}
                  disabled={
                    updateBookingRoomMutation.isPending ||
                    !changeRoomOptions.length
                  }
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <BiEditAlt className="text-sm" />
                  {t("detailPage.actions.changeRoom")}
                </button>
              )}
            </div>

            {totalDisplayedRooms === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                {t("detailPage.roomSection.empty")}
              </p>
            ) : isConfirmedStatus ? (
              <div className="mt-4 md:mt-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {bookingRooms.map((bookingRoom, index) => (
                  <div key={bookingRoom.id} className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {t("detailPage.roomSection.room")} {index + 1}
                    </p>

                    <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-[#ececec] px-3 py-2">
                      <span className="text-sm text-gray-900">
                        {bookingRoom.room?.name ||
                          `#${bookingRoom.room?.id || bookingRoom.id}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {bookingRooms.map((bookingRoom, index) => (
                  <div
                    key={bookingRoom.id}
                    className="rounded-xl border border-[#dbe2ea] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:border-[#c4d2e3] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex flex-row items-center md:items-start gap-3 md:gap-0 md:flex-col">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">
                          {t("detailPage.roomSection.room")} {index + 1}
                        </p>
                        <p className="truncate text-sm font-semibold text-[#0f172a]">
                          {bookingRoom.room?.name ||
                            `#${bookingRoom.room?.id || bookingRoom.id}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {roomDetailActions.map((action) => (
                          <button
                            key={`${bookingRoom.id}-${action.key}`}
                            type="button"
                            onClick={() =>
                              handleOpenBookingRoomDetails(
                                bookingRoom,
                                action.key,
                              )
                            }
                            className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${action.className}`}
                          >
                            {action.label}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={!bookingRoom.code}
                          onClick={() => {
                            setQrBookingRoom(bookingRoom);
                            setIsQrOpen(true);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#d1d5db] bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-[#374151] transition hover:border-[#9ca3af] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <BsQrCode className="text-xs" />
                          {t("detailPage.roomSection.showQr")}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <BookingForm
            mode="edit"
            submitting={submitting}
            readonly={!canEditBooking}
            lockPriceFields
            lockStatusField
            lockSourceField
            showSubmitButton={canEditBooking}
            extraActionButtons={
              nextStatusTargets.length > 0 ? (
                <>
                  {nextStatusTargets.map((statusTarget) => (
                    <button
                      key={statusTarget}
                      type="button"
                      onClick={() => handleUpdateStatus(statusTarget)}
                      disabled={
                        updateStatusMutation.isPending ||
                        (statusTarget === "checked-in" && !canCheckIn)
                      }
                      title={
                        statusTarget === "checked-in" && !canCheckIn
                          ? t(
                              "detailPage.statusActions.checkInRoomMismatchHint",
                            )
                          : undefined
                      }
                      className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        statusTarget === "cancelled"
                          ? "border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700"
                          : statusTarget === "checked-in"
                            ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 hover:border-emerald-700"
                            : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
                      }`}
                    >
                      {t(
                        statusTarget === "checked-in"
                          ? "detailPage.statusActions.checkIn"
                          : statusTarget === "checked-out"
                            ? "detailPage.statusActions.checkOut"
                            : "detailPage.statusActions.cancelBooking",
                      )}
                    </button>
                  ))}
                </>
              ) : null
            }
            middleActionButton={
              canDeleteBooking ? (
                <button
                  type="button"
                  onClick={handleDeleteBooking}
                  disabled={
                    deleteBookingMutation.isPending ||
                    updateMutation.isPending ||
                    updateStatusMutation.isPending
                  }
                  className="w-full cursor-pointer rounded-md border border-red-600 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {t("actions.delete")}
                </button>
              ) : null
            }
            roomTypeOptions={roomTypeOptions}
            branchOptions={branchOptions}
            sources={sources}
            initialValues={initialValues}
            meta={
              booking
                ? {
                    created_by: booking.created_by,
                    updated_by: booking.updated_by,
                    created_at: booking.created_at || booking.booked_on,
                    updated_at: booking.updated_at,
                  }
                : undefined
            }
            onCancel={handleCancel}
            onBranchChange={(value) => setBranchFilterOverride(value ?? null)}
            onSubmit={handleUpdateBooking}
            onCreateSource={handleCreateSource}
            onUpdateSource={handleUpdateSource}
            onDeleteSource={handleDeleteSource}
          />
        </Spin>
      </div>

      <BookingPredictModal
        open={isPredictModalOpen}
        onClose={() => setIsPredictModalOpen(false)}
        predict={booking?.predict}
        bookingNumber={booking?.booking_number || booking?.id}
      />

      <Modal
        open={isSelectRoomOpen}
        onCancel={() => {
          setIsSelectRoomOpen(false);
          setSelectedRoomId(undefined);
        }}
        footer={null}
        centered
        destroyOnHidden
        title={
          <span className="text-lg font-semibold text-gray-900">
            {t("detailPage.selectRoomModal.title")}
          </span>
        }
      >
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-800">
            {t("detailPage.selectRoomModal.room")}
          </label>

          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("detailPage.selectRoomModal.placeholder")}
            options={createRoomOptions}
            value={selectedRoomId}
            onChange={(value) => setSelectedRoomId(value)}
            className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
          />

          <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setIsSelectRoomOpen(false);
                setSelectedRoomId(undefined);
              }}
              disabled={createBookingRoomMutation.isPending}
              className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                handleSelectRoom();
              }}
              disabled={!selectedRoomId || createBookingRoomMutation.isPending}
              className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {createBookingRoomMutation.isPending
                ? t("detailPage.selectRoomModal.processing")
                : t("detailPage.selectRoomModal.submit")}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isChangeRoomOpen}
        onCancel={() => {
          setIsChangeRoomOpen(false);
          setSelectedBookingRoomId(undefined);
          setNextRoomId(undefined);
        }}
        footer={null}
        centered
        destroyOnHidden
        title={
          <span className="text-lg font-semibold text-gray-900">
            {t("detailPage.changeRoomModal.title")}
          </span>
        }
      >
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-800">
            {t("detailPage.changeRoomModal.bookingRoom")}
          </label>

          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("detailPage.changeRoomModal.bookingRoomPlaceholder")}
            options={bookingRoomOptions}
            value={activeBookingRoomId}
            onChange={(value) => {
              setSelectedBookingRoomId(value);
              setNextRoomId(undefined);
            }}
            className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
          />

          <label className="mt-1 text-sm font-medium text-gray-800">
            {t("detailPage.changeRoomModal.newRoom")}
          </label>

          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("detailPage.changeRoomModal.newRoomPlaceholder")}
            options={changeRoomOptions}
            value={effectiveNextRoomId}
            onChange={(value) => setNextRoomId(value)}
            className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
          />

          {selectedBookingRoom?.room?.name && (
            <p className="text-xs text-gray-500">
              {t("detailPage.changeRoomModal.currentRoom")}:{" "}
              <span className="font-medium text-gray-700">
                {selectedBookingRoom.room.name}
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setIsChangeRoomOpen(false);
                setSelectedBookingRoomId(undefined);
                setNextRoomId(undefined);
              }}
              disabled={updateBookingRoomMutation.isPending}
              className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleChangeRoom();
              }}
              disabled={
                !activeBookingRoomId ||
                !effectiveNextRoomId ||
                updateBookingRoomMutation.isPending
              }
              className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {updateBookingRoomMutation.isPending
                ? t("detailPage.changeRoomModal.processing")
                : t("detailPage.changeRoomModal.submit")}
            </button>
          </div>
        </div>
      </Modal>

      <BookingRoomQrModal
        open={isQrOpen}
        bookingRoom={qrBookingRoom}
        bookingNumber={booking?.booking_number}
        onClose={() => {
          setIsQrOpen(false);
          setQrBookingRoom(null);
        }}
      />

      <BookingRoomDetailsModal
        key={`${detailsBookingRoom?.id || "none"}-${detailsInitialTab}`}
        open={isRoomDetailsOpen}
        bookingRoom={detailsBookingRoom}
        bookingStatus={booking?.status}
        bookingBranchId={bookingBranchId}
        initialTab={detailsInitialTab}
        showTabNavigation={false}
        onClose={() => {
          setIsRoomDetailsOpen(false);
          setDetailsBookingRoom(null);
          setDetailsInitialTab("review");
        }}
      />
    </div>
  );
}
