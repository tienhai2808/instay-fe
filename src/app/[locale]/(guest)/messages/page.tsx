"use client";

import { getGuestChats } from "@/apis/chat";
import { getDepartmentByIdentifier } from "@/apis/department";
import { Link } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { subscribeWebSocket } from "@/services/websocket";
import { useGuestStore } from "@/stores/useGuestStore";
import type { BasicChatResponse } from "@/types/response/chat";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import {
  DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME,
  resolveDepartmentFromResponse,
  resolveDepartmentInitials,
} from "./utils/chat-utils";

const PAGE_LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 350;
const TYPING_INDICATOR_TIMEOUT_MS = 2600;

type MessageListItem = {
  chat: BasicChatResponse;
  mode: "detail" | "preview";
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const resolveUnreadCountFromChat = (chat: BasicChatResponse) => {
  const record = chat as unknown as Record<string, unknown>;
  const unreadCountRaw = record.unread_count;
  const unreadCount =
    typeof unreadCountRaw === "number" && Number.isFinite(unreadCountRaw)
      ? Math.max(0, Math.floor(unreadCountRaw))
      : 0;

  const hasUnread =
    record.has_unread === true ||
    record.is_unread === true ||
    (typeof unreadCountRaw === "string" && unreadCountRaw.trim() !== "0");

  if (hasUnread) return Math.max(unreadCount, 1);
  return unreadCount;
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
    createdAt: toTrimmedString(record.created_at) || dayjs().toISOString(),
  };
};

export default function MessagesPage() {
  const t = useTranslations("MessagesPage");
  const queryClient = useQueryClient();
  const messageApi = useMessage();
  const bookingRoomId = useGuestStore(
    (state) => state.bookingRoom?.id?.trim() || "",
  );

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const [liveChats, setLiveChats] = useState<BasicChatResponse[]>([]);
  const [unreadByChatId, setUnreadByChatId] = useState<Record<string, number>>(
    {},
  );
  const [typingByChatId, setTypingByChatId] = useState<
    Record<string, { senderName: string }>
  >({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const chatLookupRef = useRef<Map<string, BasicChatResponse>>(new Map());
  const typingTimeoutByChatIdRef = useRef<Map<string, number>>(new Map());

  const resolveChatTime = (value: string | null | undefined) => {
    const now = dayjs(relativeTimeNow);
    const parsed = dayjs(value);
    if (!parsed.isValid()) return "-";

    const diffMinutes = now.diff(parsed, "minute");
    if (diffMinutes < 1) return t("time.now");
    if (diffMinutes < 60) return `${diffMinutes}m`;

    const diffHours = now.diff(parsed, "hour");
    if (diffHours < 24) return `${diffHours}h`;

    const diffDays = now.diff(parsed, "day");
    if (diffDays < 7) return `${diffDays}d`;

    return parsed.format("DD/MM");
  };

  const resolvePreviewText = (
    chat: BasicChatResponse,
    mode: MessageListItem["mode"],
  ) => {
    if (mode === "preview") return t("defaultPreview");

    const content = toTrimmedString(chat.last_message_content);
    const attachmentType = toTrimmedString(
      chat.last_message_attachment_type,
    ).toLowerCase();
    const attachmentLabel =
      attachmentType === "image"
        ? t("attachments.image")
        : attachmentType === "file"
          ? t("attachments.file")
          : "";

    const basePreviewText = content || attachmentLabel || t("defaultPreview");
    const hasPreviewPayload = Boolean(content || attachmentLabel);
    if (!hasPreviewPayload) return basePreviewText;

    const lastSenderType = toTrimmedString(
      chat.last_message_sender_type,
    ).toLowerCase();
    if (lastSenderType === "staff") {
      return `${t("prefixes.hotel")}${basePreviewText}`;
    }
    if (lastSenderType === "guest") {
      return `${t("prefixes.you")}${basePreviewText}`;
    }

    return basePreviewText;
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

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
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["guest", "chats", "list", PAGE_LIMIT, debouncedSearch],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      await getGuestChats({
        page: Number(pageParam),
        limit: PAGE_LIMIT,
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
    const deduped = new Map<string, BasicChatResponse>();

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

  const shouldLoadDefaultDepartment =
    !isLoading &&
    !error &&
    mergedChats.length === 0 &&
    debouncedSearch.trim().length === 0;

  const {
    data: defaultDepartmentRes,
    error: defaultDepartmentError,
    isFetching: isDefaultDepartmentFetching,
  } = useQuery({
    queryKey: [
      "guest",
      "department",
      "default",
      DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME,
    ],
    queryFn: async () =>
      await getDepartmentByIdentifier(DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME),
    enabled: shouldLoadDefaultDepartment,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!defaultDepartmentError) return;
    messageApi.errorFromApi(defaultDepartmentError);
  }, [defaultDepartmentError, messageApi]);

  const defaultDepartment = useMemo(
    () => resolveDepartmentFromResponse(defaultDepartmentRes?.data?.data),
    [defaultDepartmentRes?.data?.data],
  );

  const defaultDepartmentName =
    defaultDepartment?.name?.trim() || t("departmentFallback");
  const defaultDepartmentId = defaultDepartment?.id?.trim() || "";

  const messageItems = useMemo<MessageListItem[]>(() => {
    if (mergedChats.length > 0) {
      return mergedChats.map((chat) => ({
        chat,
        mode: "detail",
      }));
    }

    if (!defaultDepartmentName) return [];

    const fallbackChat: BasicChatResponse = {
      id: defaultDepartmentId || "default-customer-service",
      department: {
        id: defaultDepartmentId || "default-customer-service",
        name: defaultDepartmentName,
      },
      last_message_at: null,
      last_message_content: null,
      last_message_attachment_type: null,
      last_message_sender_name: null,
      last_message_sender_type: null,
    };

    return [
      {
        chat: fallbackChat,
        mode: "preview",
      },
    ];
  }, [defaultDepartmentId, defaultDepartmentName, mergedChats]);

  useEffect(() => {
    const nextLookup = new Map<string, BasicChatResponse>();
    for (const item of messageItems) {
      if (item.mode !== "detail") continue;
      const id = toTrimmedString(item.chat.id);
      if (!id) continue;
      nextLookup.set(id, item.chat);
    }
    chatLookupRef.current = nextLookup;
  }, [messageItems]);

  const isPageLoading = isLoading || isDefaultDepartmentFetching;

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
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, messageItems.length]);

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
              queryKey: ["guest", "chats", "list"],
            });
            return;
          }

          const updatedChat: BasicChatResponse = {
            ...existingChat,
            id: wsMessage.chatId,
            last_message_at:
              wsMessage.createdAt || existingChat.last_message_at,
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

          if (wsMessage.senderType === "staff") {
            setUnreadByChatId((previous) => ({
              ...previous,
              [wsMessage.chatId]:
                Math.max(0, previous[wsMessage.chatId] || 0) + 1,
            }));
            return;
          }

          if (
            wsMessage.senderType === "guest" &&
            wsMessage.senderId === bookingRoomId
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
          const typingRecord =
            toRecord(payloadData?.typing) ||
            payloadData ||
            toRecord(payload.data);
          if (!typingRecord) return;

          const chatId = toTrimmedString(typingRecord.chat_id);
          const senderType = toTrimmedString(
            typingRecord.sender_type,
          ).toLowerCase();
          if (!chatId || senderType !== "staff") return;

          setTypingByChatId((previous) => ({
            ...previous,
            [chatId]: {
              senderName: t("departmentFallback"),
            },
          }));

          const prevTimeoutId = typingTimeoutByChatIdRef.current.get(chatId);
          if (prevTimeoutId) window.clearTimeout(prevTimeoutId);
          const timeoutId = window.setTimeout(() => {
            setTypingByChatId((previous) => {
              if (!previous[chatId]) return previous;
              const next = { ...previous };
              delete next[chatId];
              return next;
            });
            typingTimeoutByChatIdRef.current.delete(chatId);
          }, TYPING_INDICATOR_TIMEOUT_MS);
          typingTimeoutByChatIdRef.current.set(chatId, timeoutId);
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

          if (readerType === "guest" && readerId === bookingRoomId) {
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
  }, [bookingRoomId, queryClient, t]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col bg-white pb-24">
      <section className="px-4 pb-2 pt-4">
        <h1 className="mt-3 text-2xl font-bold leading-tight text-[#111827]">
          {t("title")}
        </h1>

        <label className="relative mt-4 block">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-[#e5e7eb] bg-white px-9 pr-3 text-sm text-[#111827] shadow-[0_1px_3px_rgba(15,23,42,0.12)] outline-none transition focus:border-[#8b5cf6] focus:ring-2 focus:ring-[#8b5cf6]/20"
          />
        </label>
      </section>

      <section className="mt-2 flex-1">
        {isPageLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-4"
              >
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-[#fde047]" />
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-1/3 animate-pulse rounded-md bg-[#e5e7eb]" />
                  <div className="mt-2 h-4 w-2/3 animate-pulse rounded-md bg-[#e5e7eb]" />
                </div>
                <div className="h-4 w-8 animate-pulse rounded-md bg-[#e5e7eb]" />
              </div>
            ))}
          </div>
        ) : messageItems.length > 0 ? (
          <div className="border-t border-[#e5e7eb]">
            {messageItems.map((item, index) => {
              const chat = item.chat;
              const chatId = toTrimmedString(chat.id);
              const departmentName =
                toTrimmedString(chat.department?.name) ||
                t("departmentFallback");
              const typingState = typingByChatId[chatId];
              const previewText = typingState
                ? t("typing.staffList", {
                    name: typingState.senderName || t("departmentFallback"),
                  })
                : resolvePreviewText(chat, item.mode);
              const previewTime = resolveChatTime(chat.last_message_at);
              const avatarLabel = resolveDepartmentInitials(departmentName);
              const departmentId = toTrimmedString(chat.department?.id);
              const previewHref = departmentId
                ? `/messages/preview?department_id=${encodeURIComponent(departmentId)}`
                : "/messages/preview";

              const unreadCount =
                item.mode === "preview"
                  ? 1
                  : Math.max(
                      resolveUnreadCountFromChat(chat),
                      unreadByChatId[chatId] || 0,
                    );
              const isUnread = unreadCount > 0;

              return (
                <Link
                  key={chatId || `chat-${index}`}
                  href={
                    item.mode === "preview"
                      ? previewHref
                      : chatId
                        ? `/messages/${chatId}`
                        : "/messages"
                  }
                  onClick={() => {
                    if (item.mode !== "detail" || !chatId) return;
                    setUnreadByChatId((previous) => {
                      if (!previous[chatId]) return previous;
                      const next = { ...previous };
                      delete next[chatId];
                      return next;
                    });
                    setTypingByChatId((previous) => {
                      if (!previous[chatId]) return previous;
                      const next = { ...previous };
                      delete next[chatId];
                      return next;
                    });
                  }}
                  className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-4 transition-colors active:bg-[#eceff3]"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fde047] text-base font-bold text-[#111827]">
                    {avatarLabel}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-base font-semibold leading-tight text-[#111827]">
                      {departmentName}
                    </p>
                    <p
                      className={`line-clamp-1 text-sm ${
                        isUnread
                          ? "font-semibold text-[#111827]"
                          : "text-[#6b7280]"
                      }`}
                    >
                      {previewText}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[#9ca3af]">
                      {previewTime}
                    </span>
                    {isUnread ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#7c3aed]" />
                    ) : null}
                  </div>
                </Link>
              );
            })}

            {hasNextPage ? <div ref={loadMoreRef} className="h-1" /> : null}

            {isFetchingNextPage ? (
              <p className="px-4 py-3 text-center text-sm font-medium text-[#6b7280]">
                {t("loadingMore")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="px-4 py-6">
            <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-5 text-center text-sm font-medium text-[#6b7280]">
              {t("empty")}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
