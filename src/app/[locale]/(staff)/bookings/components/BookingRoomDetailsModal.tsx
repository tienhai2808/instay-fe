"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Empty, Modal, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBookingRoomById, getBookingRoomGuests } from "@/apis/booking_room";
import {
  createGuest,
  createGuestVerificationSession,
  deleteGuest,
  updateGuest,
} from "@/apis/guest";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type {
  BookingStatus,
  SimpleBookingRoomResponse,
} from "@/types/data/booking";
import type { BookingRoomGuest } from "@/types/data/booking_room";
import {
  canManageGuests,
  canManageOrderServices,
  canManageSupportTickets,
  createAuthzSnapshot,
  isAdminSnapshot,
} from "@/utils/access-control";
import BookingRoomDetailsTabs, {
  type BookingRoomDetailsTabKey,
} from "./BookingRoomDetailsTabs";
import BookingRoomGuestModal, {
  type GuestFormSubmitValues,
  type GuestModalMode,
} from "./BookingRoomGuestModal";
import BookingRoomServiceOrderModal from "./BookingRoomServiceOrderModal";
import BookingRoomVerificationModal from "./BookingRoomVerificationModal";
import {
  DIDIT_DEFAULT_ORIGINS,
  EMPTY_VALUE,
  extractDiditMessageMeta,
  formatEnumLabel,
  getBookingRoomDetailsFromPayload,
  getGuestVerificationSessionMeta,
  hasDiditCompletionSignal,
  isAllowedDiditOrigin,
  isVerificationFailureStatus,
  normalizeGuests,
} from "../utils/booking-room-details-modal";

interface BookingRoomDetailsModalProps {
  open: boolean;
  bookingRoom: SimpleBookingRoomResponse | null;
  bookingStatus?: BookingStatus;
  bookingBranchId?: string;
  initialTab?: BookingRoomDetailsTabKey;
  showTabNavigation?: boolean;
  onClose: () => void;
}

const BOOKING_ROOM_TAB_ORDER: BookingRoomDetailsTabKey[] = [
  "stay",
  "services",
  "support",
  "review",
];

export default function BookingRoomDetailsModal({
  open,
  bookingRoom,
  bookingStatus,
  bookingBranchId,
  initialTab,
  showTabNavigation = true,
  onClose,
}: BookingRoomDetailsModalProps) {
  const t = useTranslations("BookingsPage");
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const authzSnapshot = useMemo(() => createAuthzSnapshot(user), [user]);
  const isAdmin = isAdminSnapshot(authzSnapshot);

  const [activeTab, setActiveTab] = useState<BookingRoomDetailsTabKey>(
    initialTab || "stay",
  );
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestModalMode, setGuestModalMode] =
    useState<GuestModalMode>("create");
  const [editingGuest, setEditingGuest] = useState<BookingRoomGuest | null>(
    null,
  );
  const [serviceOrderModalOpen, setServiceOrderModalOpen] = useState(false);
  const [isDiditModalOpen, setIsDiditModalOpen] = useState(false);
  const [diditSessionId, setDiditSessionId] = useState<string>();
  const [diditVerificationUrl, setDiditVerificationUrl] = useState("");
  const [diditVerificationStatus, setDiditVerificationStatus] =
    useState<string>();

  const diditSuccessRefetchTimeoutsRef = useRef<number[]>([]);
  const diditGuestCountBeforeScanRef = useRef(0);

  const bookingRoomId = bookingRoom?.id ? String(bookingRoom.id) : undefined;

  const {
    data: bookingRoomRes,
    isFetching: loadingBookingRoom,
    error: bookingRoomError,
  } = useQuery({
    queryKey: queryKeys.bookingRooms.detail(bookingRoomId || ""),
    queryFn: async () => getBookingRoomById(bookingRoomId as string),
    enabled: open && Boolean(bookingRoomId),
  });

  const { data: bookingRoomGuestsRes, error: bookingRoomGuestsError } =
    useQuery({
      queryKey: queryKeys.bookingRooms.guests(bookingRoomId || ""),
      queryFn: async () => getBookingRoomGuests(bookingRoomId as string),
      enabled: open && Boolean(bookingRoomId),
    });

  useEffect(() => {
    if (!bookingRoomError) return;
    messageApi.errorFromApi(bookingRoomError);
  }, [bookingRoomError, messageApi]);

  useEffect(() => {
    if (!bookingRoomGuestsError) return;
    messageApi.errorFromApi(bookingRoomGuestsError);
  }, [bookingRoomGuestsError, messageApi]);

  const refreshGuestList = async () => {
    if (!bookingRoomId) return;

    await queryClient.fetchQuery({
      queryKey: queryKeys.bookingRooms.guests(bookingRoomId),
      queryFn: async () => getBookingRoomGuests(bookingRoomId),
    });
  };

  const createGuestMutation = useMutation({
    mutationFn: async (payload: {
      full_name: string;
      dob: string;
      national: string;
      passport_number: string;
      booking_room_id: string;
    }) => createGuest(payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setGuestModalOpen(false);
      setEditingGuest(null);
      await refreshGuestList();
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const updateGuestMutation = useMutation({
    mutationFn: async (variables: {
      id: string;
      payload: {
        full_name: string;
        dob: string;
        national: string;
        passport_number: string;
        booking_room_id?: string;
      };
    }) => updateGuest(variables.id, variables.payload),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setGuestModalOpen(false);
      setEditingGuest(null);
      await refreshGuestList();
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: string) => deleteGuest(id),
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await refreshGuestList();
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const createVerificationSessionMutation = useMutation({
    mutationFn: async (payload: { booking_room_id?: string }) =>
      createGuestVerificationSession(payload),
    onSuccess: (res) => {
      const { sessionId, verificationUrl } = getGuestVerificationSessionMeta(
        res.data?.data,
      );

      if (!verificationUrl) {
        messageApi.error(
          t(
            "detailPage.bookingRoomDetailsModal.verification.errors.missingUrl",
          ),
        );
        return;
      }

      setDiditSessionId(sessionId);
      setDiditVerificationUrl(verificationUrl);
      setDiditVerificationStatus(undefined);
      setIsDiditModalOpen(true);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const allowedDiditOrigins = useMemo(() => {
    const origins = new Set<string>(DIDIT_DEFAULT_ORIGINS);

    if (!diditVerificationUrl) return origins;

    try {
      const parsedUrl = new URL(diditVerificationUrl);
      origins.add(parsedUrl.origin);
    } catch {
      return origins;
    }

    return origins;
  }, [diditVerificationUrl]);

  useEffect(() => {
    if (!isDiditModalOpen) return;

    const handleDiditMessage = (event: MessageEvent) => {
      if (
        !isAllowedDiditOrigin(
          event.origin,
          allowedDiditOrigins,
          diditVerificationUrl,
        )
      ) {
        return;
      }

      const { type, status, sessionId } = extractDiditMessageMeta(event.data);
      if (!hasDiditCompletionSignal(type, status)) return;

      const completedSessionId = sessionId || diditSessionId;
      const normalizedStatus = (status || "").trim().toLocaleLowerCase();
      const normalizedType = (type || "").trim().toLocaleLowerCase();
      const isFailureSignal =
        isVerificationFailureStatus(normalizedStatus) ||
        (!normalizedStatus && isVerificationFailureStatus(normalizedType));
      const isSuccessSignal = !isFailureSignal;

      if (status) {
        setDiditVerificationStatus(status);
      }

      if (isSuccessSignal) {
        messageApi.success(
          t(
            "detailPage.bookingRoomDetailsModal.verification.sessionCompleted",
            {
              sessionId: completedSessionId || EMPTY_VALUE,
              status: formatEnumLabel(status || type),
            },
          ),
        );
      } else {
        messageApi.error(
          t("detailPage.bookingRoomDetailsModal.verification.sessionFailed", {
            sessionId: completedSessionId || EMPTY_VALUE,
            status: formatEnumLabel(status || type),
          }),
        );
      }

      setIsDiditModalOpen(false);
      setDiditVerificationUrl("");
      setDiditSessionId(undefined);
      setDiditVerificationStatus(undefined);

      if (!isSuccessSignal || !bookingRoomId) {
        diditSuccessRefetchTimeoutsRef.current.forEach((timeoutId) => {
          window.clearTimeout(timeoutId);
        });
        diditSuccessRefetchTimeoutsRef.current = [];
        return;
      }

      diditSuccessRefetchTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      diditSuccessRefetchTimeoutsRef.current = [];

      const targetGuestCount = diditGuestCountBeforeScanRef.current + 1;
      const pollingDelaysMs = [3000, 4500, 6000];

      pollingDelaysMs.forEach((delayMs) => {
        const timeoutId = window.setTimeout(() => {
          void (async () => {
            try {
              const res = await queryClient.fetchQuery({
                queryKey: queryKeys.bookingRooms.guests(bookingRoomId),
                queryFn: async () => getBookingRoomGuests(bookingRoomId),
              });
              const nextGuestCount = normalizeGuests(
                res?.data?.data?.guests,
              ).length;

              if (nextGuestCount >= targetGuestCount) {
                diditSuccessRefetchTimeoutsRef.current.forEach(
                  (nextTimeoutId) => {
                    window.clearTimeout(nextTimeoutId);
                  },
                );
                diditSuccessRefetchTimeoutsRef.current = [];
              }
            } catch {
              // Ignore polling errors and continue remaining attempts.
            }
          })();
        }, delayMs);

        diditSuccessRefetchTimeoutsRef.current.push(timeoutId);
      });
    };

    window.addEventListener("message", handleDiditMessage);
    return () => {
      window.removeEventListener("message", handleDiditMessage);
    };
  }, [
    allowedDiditOrigins,
    bookingRoomId,
    diditSessionId,
    diditVerificationUrl,
    isDiditModalOpen,
    messageApi,
    queryClient,
    t,
  ]);

  useEffect(() => {
    return () => {
      diditSuccessRefetchTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      diditSuccessRefetchTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    diditSuccessRefetchTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    diditSuccessRefetchTimeoutsRef.current = [];
  }, [bookingRoomId]);

  const bookingRoomDetails = useMemo(
    () => getBookingRoomDetailsFromPayload(bookingRoomRes?.data?.data),
    [bookingRoomRes?.data?.data],
  );

  const guests = useMemo(
    () => normalizeGuests(bookingRoomGuestsRes?.data?.data?.guests),
    [bookingRoomGuestsRes?.data?.data?.guests],
  );

  const orderServices = bookingRoomDetails?.order_services || [];
  const supportTickets = bookingRoomDetails?.support_tickets || [];
  const review = bookingRoomDetails?.review;

  const canAccessStayTab = isAdmin || canManageGuests(authzSnapshot);
  const canAccessServicesTab = isAdmin || canManageOrderServices(authzSnapshot);
  const canAccessSupportTab = isAdmin || canManageSupportTickets(authzSnapshot);

  const allowedTabSet = useMemo(() => {
    const allowedTabs = new Set<BookingRoomDetailsTabKey>(["review"]);

    if (canAccessStayTab) {
      allowedTabs.add("stay");
    }

    if (canAccessServicesTab) {
      allowedTabs.add("services");
    }

    if (canAccessSupportTab) {
      allowedTabs.add("support");
    }

    return allowedTabs;
  }, [canAccessServicesTab, canAccessStayTab, canAccessSupportTab]);

  const fallbackTab = useMemo(
    () =>
      BOOKING_ROOM_TAB_ORDER.find((tabKey) => allowedTabSet.has(tabKey)) ||
      "review",
    [allowedTabSet],
  );
  const preferredTab =
    initialTab && allowedTabSet.has(initialTab) ? initialTab : fallbackTab;
  const resolvedActiveTab = allowedTabSet.has(activeTab)
    ? activeTab
    : preferredTab;

  const isGuestMutating =
    createGuestMutation.isPending ||
    updateGuestMutation.isPending ||
    deleteGuestMutation.isPending;

  const isCheckedInStatus = bookingStatus === "checked-in";
  const canStartVerification =
    Boolean(bookingRoomId) &&
    isCheckedInStatus &&
    !createVerificationSessionMutation.isPending;
  const canAddAction = isCheckedInStatus;

  const openCreateGuestModal = () => {
    if (!bookingRoomId || !canAccessStayTab || !canAddAction) return;
    setGuestModalMode("create");
    setEditingGuest(null);
    setGuestModalOpen(true);
  };

  const openEditGuestModal = (guest: BookingRoomGuest) => {
    if (!canAccessStayTab || !canAddAction) return;
    setGuestModalMode("edit");
    setEditingGuest(guest);
    setGuestModalOpen(true);
  };

  const openServiceOrderModal = () => {
    if (!bookingRoomId || !canAddAction || !canAccessServicesTab) return;
    setServiceOrderModalOpen(true);
  };

  const closeServiceOrderModal = () => {
    setServiceOrderModalOpen(false);
  };

  const closeGuestModal = () => {
    if (isGuestMutating) return;
    setGuestModalOpen(false);
    setEditingGuest(null);
  };

  const handleSubmitGuest = (values: GuestFormSubmitValues) => {
    if (!bookingRoomId || isGuestMutating || !canAccessStayTab || !canAddAction)
      return;

    const payload = {
      ...values,
      booking_room_id: bookingRoomId,
    };

    if (guestModalMode === "create") {
      createGuestMutation.mutate(payload);
      return;
    }

    if (!editingGuest?.id) return;
    updateGuestMutation.mutate({
      id: editingGuest.id,
      payload,
    });
  };

  const handleDeleteGuest = (guestId: string) => {
    if (!canAccessStayTab || !canAddAction) return;
    deleteGuestMutation.mutate(guestId);
  };

  const handleStartVerification = () => {
    if (!bookingRoomId || !canAccessStayTab) return;
    diditGuestCountBeforeScanRef.current = guests.length;
    diditSuccessRefetchTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    diditSuccessRefetchTimeoutsRef.current = [];

    createVerificationSessionMutation.mutate({
      booking_room_id: bookingRoomId,
    });
  };

  const handleCloseDiditModal = () => {
    setIsDiditModalOpen(false);
    setDiditVerificationUrl("");
    setDiditSessionId(undefined);
    setDiditVerificationStatus(undefined);
  };

  const handleCloseMainModal = () => {
    setGuestModalOpen(false);
    setEditingGuest(null);
    setServiceOrderModalOpen(false);
    onClose();
  };

  const hasBookingRoom = Boolean(bookingRoomId);

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCloseMainModal}
        footer={null}
        centered
        destroyOnHidden
        width="min(1180px, calc(100vw - 24px))"
        styles={{
          header: { marginBottom: 8 },
          body: { paddingTop: 8, paddingBottom: 20 },
        }}
      >
        {!hasBookingRoom ? (
          <div className="py-16">
            <Empty
              description={t("detailPage.bookingRoomDetailsModal.empty")}
            />
          </div>
        ) : (
          <Spin spinning={loadingBookingRoom} size="large">
            <BookingRoomDetailsTabs
              activeTab={resolvedActiveTab}
              showTabNavigation={showTabNavigation}
              guests={guests}
              orderServices={orderServices}
              supportTickets={supportTickets}
              review={review}
              canAccessStayTab={canAccessStayTab}
              canAccessServicesTab={canAccessServicesTab}
              canAccessSupportTab={canAccessSupportTab}
              isCheckedInStatus={isCheckedInStatus}
              canStartVerification={canStartVerification}
              verificationPending={createVerificationSessionMutation.isPending}
              canAddAction={canAddAction}
              onTabChange={(tab) => {
                if (!allowedTabSet.has(tab)) return;
                setActiveTab(tab);
              }}
              onStartVerification={handleStartVerification}
              onAddGuest={openCreateGuestModal}
              onAddServiceOrder={openServiceOrderModal}
              onEditGuest={openEditGuestModal}
              onDeleteGuest={handleDeleteGuest}
            />
          </Spin>
        )}
      </Modal>

      <BookingRoomVerificationModal
        open={isDiditModalOpen}
        verificationUrl={diditVerificationUrl}
        sessionId={diditSessionId}
        verificationStatus={diditVerificationStatus}
        onCancel={handleCloseDiditModal}
      />

      <BookingRoomGuestModal
        open={guestModalOpen}
        mode={guestModalMode}
        guest={editingGuest}
        submitting={isGuestMutating}
        onCancel={closeGuestModal}
        onSubmit={handleSubmitGuest}
      />

      <BookingRoomServiceOrderModal
        open={serviceOrderModalOpen}
        bookingRoomId={bookingRoomId}
        branchId={bookingBranchId}
        onClose={closeServiceOrderModal}
      />
    </>
  );
}
