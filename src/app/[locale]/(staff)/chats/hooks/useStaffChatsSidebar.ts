"use client";

import { getAdminChats } from "@/apis/chat";
import { useMessage } from "@/providers/MessageProvider";
import { subscribeWebSocket } from "@/services/websocket";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";
import type { BasicAdminChatResponse } from "@/types/response/chat";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHAT_LIST_PAGE_LIMIT,
  CHAT_SEARCH_DEBOUNCE_MS,
  resolveAttachmentPreviewLabel,
  resolveBookingRoomDisplayName,
  resolveChatInitials,
  resolveChatListTime,
  resolveUnreadCountFromChat,
  toRecord,
  toTrimmedString,
} from "../utils/chat-utils";

type SidebarListMode = "detail" | "preview";
const TYPING_INDICATOR_TIMEOUT_MS = 2600;

export interface StaffSidebarItem {
  key: string;
  chatId: string;
  mode: SidebarListMode;
  displayName: string;
  initials: string;
  previewText: string;
  previewTime: string;
  unreadCount: number;
  href: string;
}

interface UseStaffChatsSidebarOptions {
  activeChatId?: string;
  previewBookingRoom?: SimpleBookingRoomResponse | null;
}

const toHref = (
  chatId: string,
  mode: SidebarListMode,
  bookingRoomId: string,
) => {
  if (mode === "preview" && bookingRoomId) {
    return `/chats/preview?booking_room_id=${encodeURIComponent(bookingRoomId)}`;
  }
  return chatId ? `/chats/${chatId}` : "/chats";
};

const normalizeWsMessage = (value: unknown) => {
  const record = toRecord(value);
  if (!record) return null;

  const chatId = toTrimmedString(record.chat_id);
  if (!chatId) return null;

  return {
    chatId,
    senderType: toTrimmedString(record.sender_type).toLowerCase(),
    senderId: toTrimmedString(record.sender_id),
    senderName: toTrimmedString(record.sender_name),
    content: toTrimmedString(record.content),
    attachmentType: toTrimmedString(record.attachment_type).toLowerCase(),
    createdAt: toTrimmedString(record.created_at),
  };
};

type SidebarChatItem = {
  chat: BasicAdminChatResponse;
  mode: SidebarListMode;
};

const createPreviewChat = (
  bookingRoom: SimpleBookingRoomResponse,
): BasicAdminChatResponse => {
  return {
    id: `preview-${toTrimmedString(bookingRoom.id) || "booking-room"}`,
    booking_room: bookingRoom,
    last_message_at: null,
    last_message_content: null,
    last_message_attachment_type: null,
    last_message_sender_name: null,
    last_message_sender_type: null,
  };
};

export const useStaffChatsSidebar = ({
  activeChatId = "",
  previewBookingRoom = null,
}: UseStaffChatsSidebarOptions) => {
  const t = useTranslations("MessagesPage");
  const queryClient = useQueryClient();
  const messageApi = useMessage();
  const staffId = useAuthStore((state) => state.user?.id?.trim() || "");

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const [liveChats, setLiveChats] = useState<BasicAdminChatResponse[]>([]);
  const [unreadByChatId, setUnreadByChatId] = useState<Record<string, number>>(
    {},
  );
  const [typingByChatId, setTypingByChatId] = useState<
    Record<string, { senderName: string }>
  >({});

  const chatLookupRef = useRef<Map<string, BasicAdminChatResponse>>(new Map());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutByChatIdRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, CHAT_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchInput]);

  useEffect(() => {
    const timeoutMap = typingTimeoutByChatIdRef.current;
    return () => {
      for (const timeoutId of timeoutMap.values()) {
        window.clearTimeout(timeoutId);
      }
      timeoutMap.clear();
    };
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);

    const timeoutId = window.setTimeout(() => {
      setRelativeTimeNow(Date.now());
      intervalId = window.setInterval(() => {
        setRelativeTimeNow(Date.now());
      }, 60_000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, []);

  const {
    data,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["staff", "chats", "list", CHAT_LIST_PAGE_LIMIT, debouncedSearch],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      await getAdminChats({
        page: Number(pageParam),
        limit: CHAT_LIST_PAGE_LIMIT,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.data.data.meta;
      if (!meta?.has_next || typeof meta.page !== "number") return undefined;
      return meta.page + 1;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!error) return;
    messageApi.errorFromApi(error);
  }, [error, messageApi]);

  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.data.data.chats || []) || [],
    [data?.pages],
  );

  const mergedChats = useMemo(() => {
    const deduped = new Map<string, BasicAdminChatResponse>();

    for (const liveChat of liveChats) {
      const id = toTrimmedString(liveChat.id);
      if (!id) continue;
      deduped.set(id, liveChat);
    }

    for (const baseChat of chats) {
      const id = toTrimmedString(baseChat.id);
      if (!id || deduped.has(id)) continue;
      deduped.set(id, baseChat);
    }

    return Array.from(deduped.values());
  }, [chats, liveChats]);

  const previewBookingRoomId = toTrimmedString(previewBookingRoom?.id);

  const sidebarChatItems = useMemo<SidebarChatItem[]>(() => {
    const detailItems = mergedChats.map((chat) => ({
      chat,
      mode: "detail" as const,
    }));

    if (!previewBookingRoomId || !previewBookingRoom) return detailItems;

    const hasExistingChat = detailItems.some((item) => {
      const bookingRoomId = toTrimmedString(item.chat.booking_room?.id);
      return bookingRoomId && bookingRoomId === previewBookingRoomId;
    });

    if (hasExistingChat) return detailItems;

    return [
      {
        chat: createPreviewChat(previewBookingRoom),
        mode: "preview",
      },
      ...detailItems,
    ];
  }, [mergedChats, previewBookingRoom, previewBookingRoomId]);

  const sidebarItems = useMemo<StaffSidebarItem[]>(() => {
    return sidebarChatItems.map((item, index) => {
      const chat = item.chat;
      const chatId = toTrimmedString(chat.id);
      const bookingRoomId = toTrimmedString(chat.booking_room?.id);
      const displayName = resolveBookingRoomDisplayName(
        chat.booking_room,
        t("detail.defaultHeader"),
      );
      const content = toTrimmedString(chat.last_message_content);
      const attachmentLabel = resolveAttachmentPreviewLabel(
        chat.last_message_attachment_type,
        t("attachments.image"),
        t("attachments.file"),
      );
      const typingState = typingByChatId[chatId];
      const basePreviewText =
        item.mode === "preview"
          ? t("staff.emptyChat")
          : content || attachmentLabel || t("staff.emptyChat");
      const hasPreviewPayload = Boolean(content || attachmentLabel);
      const lastSenderType = toTrimmedString(
        chat.last_message_sender_type,
      ).toLowerCase();
      const lastSenderName = toTrimmedString(chat.last_message_sender_name);

      const previewText =
        typingState && item.mode !== "preview"
          ? t("typing.guestList", {
              name: typingState.senderName || t("detail.defaultHeader"),
            })
          : item.mode === "preview" || !hasPreviewPayload
            ? basePreviewText
            : lastSenderType === "guest"
              ? `${t("prefixes.customer")}${basePreviewText}`
              : lastSenderType === "staff"
                ? `${lastSenderName || t("staffTitle")}: ${basePreviewText}`
                : basePreviewText;

      const unreadCount =
        item.mode === "preview"
          ? 0
          : Math.max(
              resolveUnreadCountFromChat(chat),
              unreadByChatId[chatId] || 0,
            );
      const effectiveUnreadCount =
        chatId && chatId === activeChatId ? 0 : unreadCount;

      return {
        key: `${item.mode}-${chatId || index}`,
        chatId,
        mode: item.mode,
        displayName,
        initials: resolveChatInitials(displayName),
        previewText,
        previewTime: resolveChatListTime(
          chat.last_message_at,
          t("time.now"),
          dayjs(relativeTimeNow),
        ),
        unreadCount: effectiveUnreadCount,
        href: toHref(chatId, item.mode, bookingRoomId),
      };
    });
  }, [
    activeChatId,
    relativeTimeNow,
    sidebarChatItems,
    t,
    typingByChatId,
    unreadByChatId,
  ]);

  useEffect(() => {
    const nextLookup = new Map<string, BasicAdminChatResponse>();
    for (const item of sidebarChatItems) {
      if (item.mode !== "detail") continue;
      const id = toTrimmedString(item.chat.id);
      if (!id) continue;
      nextLookup.set(id, item.chat);
    }
    chatLookupRef.current = nextLookup;
  }, [sidebarChatItems]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void fetchNextPage();
      },
      { rootMargin: "120px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, sidebarItems.length]);

  useEffect(() => {
    const unsubscribe = subscribeWebSocket({
      onEvent: (payload) => {
        if (payload.event === "new_message") {
          const payloadData = toRecord(payload.data);
          const wsMessage = normalizeWsMessage(
            payloadData?.message || payload.data,
          );
          if (!wsMessage) return;

          const existingChat = chatLookupRef.current.get(wsMessage.chatId);
          if (!existingChat) {
            void queryClient.invalidateQueries({
              queryKey: ["staff", "chats", "list"],
            });
            return;
          }

          const updatedChat: BasicAdminChatResponse = {
            ...existingChat,
            id: wsMessage.chatId,
            last_message_at:
              wsMessage.createdAt || existingChat.last_message_at || undefined,
            last_message_content: wsMessage.content || null,
            last_message_attachment_type: wsMessage.attachmentType || null,
            last_message_sender_type: wsMessage.senderType || null,
            last_message_sender_name: wsMessage.senderName || null,
          };

          setLiveChats((previous) => [
            updatedChat,
            ...previous.filter(
              (chat) => toTrimmedString(chat.id) !== wsMessage.chatId,
            ),
          ]);

          setTypingByChatId((previous) => {
            if (!previous[wsMessage.chatId]) return previous;
            const next = { ...previous };
            delete next[wsMessage.chatId];
            return next;
          });

          if (wsMessage.senderType === "guest") {
            if (wsMessage.chatId === activeChatId) return;
            setUnreadByChatId((previous) => ({
              ...previous,
              [wsMessage.chatId]:
                Math.max(0, previous[wsMessage.chatId] || 0) + 1,
            }));
            return;
          }

          if (
            wsMessage.senderType === "staff" &&
            wsMessage.senderId === staffId
          ) {
            setUnreadByChatId((previous) => {
              if (!previous[wsMessage.chatId]) return previous;
              const next = { ...previous };
              delete next[wsMessage.chatId];
              return next;
            });
          }
          return;
        }

        if (payload.event === "typing") {
          const payloadData = toRecord(payload.data);
          const typingRecord = toRecord(payloadData?.typing) || payloadData;
          if (!typingRecord) return;

          const typingChatId = toTrimmedString(typingRecord.chat_id);
          const typingSenderType = toTrimmedString(
            typingRecord.sender_type,
          ).toLowerCase();
          if (!typingChatId) return;
          if (typingSenderType !== "guest") return;

          const existingChat = chatLookupRef.current.get(typingChatId);
          const typingSenderName =
            toTrimmedString(
              existingChat?.booking_room?.booking?.guest_full_name,
            ) ||
            resolveBookingRoomDisplayName(
              existingChat?.booking_room,
              t("detail.defaultHeader"),
            );

          setTypingByChatId((previous) => ({
            ...previous,
            [typingChatId]: {
              senderName: typingSenderName,
            },
          }));

          const prevTimeoutId =
            typingTimeoutByChatIdRef.current.get(typingChatId);
          if (prevTimeoutId) window.clearTimeout(prevTimeoutId);
          const timeoutId = window.setTimeout(() => {
            setTypingByChatId((previous) => {
              if (!previous[typingChatId]) return previous;
              const next = { ...previous };
              delete next[typingChatId];
              return next;
            });
            typingTimeoutByChatIdRef.current.delete(typingChatId);
          }, TYPING_INDICATOR_TIMEOUT_MS);
          typingTimeoutByChatIdRef.current.set(typingChatId, timeoutId);
          return;
        }

        if (payload.event === "mark_read" || payload.event === "read") {
          const payloadData = toRecord(payload.data);
          const readRecord = toRecord(payloadData?.read) || payloadData;
          if (!readRecord) return;

          const readChatId = toTrimmedString(readRecord.chat_id);
          const readerType = toTrimmedString(
            readRecord.reader_type,
          ).toLowerCase();
          const readerId = toTrimmedString(readRecord.reader_id);
          if (!readChatId) return;

          if (readerType === "staff" && readerId === staffId) {
            setUnreadByChatId((previous) => {
              if (!previous[readChatId]) return previous;
              const next = { ...previous };
              delete next[readChatId];
              return next;
            });
          }
        }
      },
    });

    return unsubscribe;
  }, [activeChatId, queryClient, staffId, t]);

  const markChatAsRead = (chatId: string) => {
    const normalizedChatId = chatId.trim();
    if (!normalizedChatId) return;

    setUnreadByChatId((previous) => {
      if (!previous[normalizedChatId]) return previous;
      const next = { ...previous };
      delete next[normalizedChatId];
      return next;
    });

    setTypingByChatId((previous) => {
      if (!previous[normalizedChatId]) return previous;
      const next = { ...previous };
      delete next[normalizedChatId];
      return next;
    });
  };

  return {
    isLoading,
    isFetchingNextPage,
    hasNextPage: Boolean(hasNextPage),
    loadMoreRef,
    searchInput,
    setSearchInput,
    sidebarItems,
    markChatAsRead,
  };
};
