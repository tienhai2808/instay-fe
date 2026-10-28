"use client";

import { getGuestChatMessages } from "@/apis/chat";
import { useMessage } from "@/providers/MessageProvider";
import {
  sendWebSocketMessage,
  sendWebSocketMessageWithRetry,
  subscribeWebSocket,
} from "@/services/websocket";
import { useGuestStore } from "@/stores/useGuestStore";
import type {
  ChatAttachmentType,
  ChatMessageResponse,
  MessageReactionEmojiType,
} from "@/types/response/chat";
import { resolvePublicImageUrl } from "@/utils/media";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Image as AntImage } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiCornerUpLeft, FiFileText, FiSmile } from "react-icons/fi";
import MessageComposer, {
  MessageComposerReplyTarget,
  MessageComposerSubmitPayload,
} from "../components/Composer";
import MessageHeader from "../components/Header";

const CHAT_MESSAGES_PAGE_LIMIT = 20;
const STAFF_SENDER_NAME_FOR_GUEST = "bộ phận";
const HIGHLIGHT_DURATION_MS = 1800;
const MAX_REPLY_LAZY_LOAD_STEPS = 30;
const TYPING_INDICATOR_TIMEOUT_MS = 2600;

type ReactionEmojiType = "heart" | "like" | "sad" | "fun" | "angry";

const REACTION_PICKER_OPTIONS: ReactionEmojiType[] = [
  "heart",
  "like",
  "sad",
  "fun",
  "angry",
];
const REACTION_PICKER_MIN_MARGIN_PX = 8;
const REACTION_PICKER_GAP_PX = 8;
const REACTION_PICKER_APPROX_WIDTH_PX = 196;
const REACTION_PICKER_APPROX_HEIGHT_PX = 40;
const TIMELINE_SEPARATOR_GAP_MINUTES = 10;

const REACTION_EMOJI_LABEL: Record<string, string> = {
  heart: "❤️",
  like: "👍",
  sad: "😢",
  fun: "😆",
  angry: "😠",
};

type PreviewAttachmentType = "image" | "file";

interface CreateMessageWebSocketData {
  attachment_type?: PreviewAttachmentType;
  content?: string;
  attachment_key?: string;
  chat_id?: string;
  department_id: string;
  booking_room_id: string;
  message_id?: string;
  sender_id: string;
  sender_type: "guest";
  sender_name: string;
}

interface CreateMessageWebSocketEnvelope {
  event: "new_message";
  data: CreateMessageWebSocketData;
}

interface UpdateMessageReactionWebSocketData {
  message_id: string;
  chat_id: string;
  department_id: string;
  booking_room_id: string;
  sender_name: string;
  sender_type: "guest";
  sender_id: string;
  emoji: ReactionEmojiType;
}

interface UpdateMessageReactionEnvelope {
  event: "reaction";
  data: UpdateMessageReactionWebSocketData;
}

interface UpdateMessageReadWebSocketData {
  chat_id: string;
  department_id: string;
  booking_room_id: string;
  reader_name: string;
  reader_type: "guest";
  reader_id: string;
}

interface UpdateMessageReadEnvelope {
  event: "mark_read";
  data: UpdateMessageReadWebSocketData;
}

interface TypingWebSocketData {
  chat_id: string;
  department_id: string;
  booking_room_id: string;
  sender_type: "guest";
}

interface TypingWebSocketEnvelope {
  event: "typing";
  data: TypingWebSocketData;
}

interface TypingIndicatorState {
  senderName: string;
}

interface ReactionEventPayload {
  messageId: string;
  chatId: string;
  senderId: string;
  senderType: string;
  senderName: string;
  emoji: ReactionEmojiType;
  isReacted: boolean;
  messageReactions: ChatMessageResponse["message_reaction"];
}

interface ReadEventPayload {
  chatId: string;
  readerId: string;
  readerName: string;
  readerType: string;
}

interface TypingEventPayload {
  chatId: string;
  senderType: string;
}

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const toNullableTrimmedString = (value: unknown) => {
  const next = toTrimmedString(value);
  return next || null;
};

const createLocalMessageId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const resolveAttachmentType = (file: File): PreviewAttachmentType => {
  return file.type.startsWith("image/") ? "image" : "file";
};

const resolveAttachmentLabel = (
  type: ChatAttachmentType | null | undefined,
  fallback: string,
) => {
  const normalized = toTrimmedString(type).toLowerCase();
  if (normalized === "image") return "[Hình ảnh]";
  if (normalized === "file") return "[Tệp đính kèm]";
  return fallback;
};

const resolveReactionEmoji = (emoji: MessageReactionEmojiType | undefined) => {
  const normalized = toTrimmedString(emoji).toLowerCase();
  return REACTION_EMOJI_LABEL[normalized] || "🙂";
};

const parseMessageTime = (value: string | undefined) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return parsed.isSame(dayjs(), "day")
    ? parsed.format("HH:mm")
    : parsed.format("DD/MM/YYYY • HH:mm");
};

const parseTimelineTime = (value: string | undefined) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return parsed.isSame(dayjs(), "day")
    ? parsed.format("HH:mm")
    : parsed.format("DD/MM/YYYY • HH:mm");
};

const normalizeWsMessage = (value: unknown): ChatMessageResponse | null => {
  const record = toRecord(value);
  if (!record) return null;

  const id = toTrimmedString(record.id);
  if (!id) return null;

  return {
    id,
    chat_id: toTrimmedString(record.chat_id) || undefined,
    sender_type: toTrimmedString(record.sender_type) || undefined,
    sender_id: toTrimmedString(record.sender_id) || undefined,
    sender_name: toTrimmedString(record.sender_name) || undefined,
    attachment_key: toNullableTrimmedString(record.attachment_key),
    attachment_type: toTrimmedString(record.attachment_type) || undefined,
    content: toNullableTrimmedString(record.content),
    booking_room_read_at: toNullableTrimmedString(record.booking_room_read_at),
    message_users: Array.isArray(record.message_users)
      ? (record.message_users as ChatMessageResponse["message_users"])
      : [],
    is_deleted: Boolean(record.is_deleted),
    message_reaction: Array.isArray(record.message_reaction)
      ? (record.message_reaction as ChatMessageResponse["message_reaction"])
      : [],
    created_at: toTrimmedString(record.created_at) || dayjs().toISOString(),
    message_reply: toRecord(record.message_reply)
      ? (record.message_reply as ChatMessageResponse["message_reply"])
      : null,
  };
};

const buildMessageSignature = (
  content: string | null | undefined,
  attachmentKey: string | null | undefined,
) => {
  return `${toTrimmedString(content)}|${toTrimmedString(attachmentKey)}`;
};

const isLocalMessage = (messageId: string) => messageId.startsWith("local-");

const sendNewMessageEvent = async (data: CreateMessageWebSocketData) => {
  const payload: CreateMessageWebSocketEnvelope = {
    event: "new_message",
    data,
  };

  const isSent = await sendWebSocketMessageWithRetry(payload);
  if (!isSent) {
    throw new Error("ws_send_failed");
  }
};

const sendReactionEvent = (data: UpdateMessageReactionWebSocketData) => {
  const payload: UpdateMessageReactionEnvelope = {
    event: "reaction",
    data,
  };

  const isSent = sendWebSocketMessage(payload);
  if (!isSent) {
    throw new Error("ws_send_failed");
  }
};

const sendMarkReadEvent = (data: UpdateMessageReadWebSocketData) => {
  const payload: UpdateMessageReadEnvelope = {
    event: "mark_read",
    data,
  };

  const isSent = sendWebSocketMessage(payload);
  if (!isSent) {
    throw new Error("ws_send_failed");
  }
};

const sendTypingEvent = (data: TypingWebSocketData) => {
  const payload: TypingWebSocketEnvelope = {
    event: "typing",
    data,
  };

  sendWebSocketMessage(payload);
};

const normalizeReactionPayload = (
  value: unknown,
): ReactionEventPayload | null => {
  const record = toRecord(value);
  if (!record) return null;

  const payload = toRecord(record.reaction) || record;
  const messageId = toTrimmedString(payload.message_id);
  const chatId = toTrimmedString(payload.chat_id);
  if (!messageId || !chatId) return null;

  const emoji = toTrimmedString(
    payload.emoji,
  ).toLowerCase() as ReactionEmojiType;
  if (!REACTION_PICKER_OPTIONS.includes(emoji)) return null;

  return {
    messageId,
    chatId,
    senderId: toTrimmedString(payload.sender_id),
    senderType: toTrimmedString(payload.sender_type).toLowerCase(),
    senderName: toTrimmedString(payload.sender_name),
    emoji,
    isReacted: payload.is_reacted !== false,
    messageReactions: Array.isArray(payload.message_reactions)
      ? (payload.message_reactions as ChatMessageResponse["message_reaction"])
      : [],
  };
};

const normalizeReadPayload = (value: unknown): ReadEventPayload | null => {
  const record = toRecord(value);
  if (!record) return null;

  const payload = toRecord(record.read) || record;
  const chatId = toTrimmedString(payload.chat_id);
  if (!chatId) return null;

  return {
    chatId,
    readerId: toTrimmedString(payload.reader_id),
    readerName: toTrimmedString(payload.reader_name),
    readerType: toTrimmedString(payload.reader_type).toLowerCase(),
  };
};

const normalizeTypingPayload = (value: unknown): TypingEventPayload | null => {
  const record = toRecord(value);
  if (!record) return null;

  const payload = toRecord(record.typing) || record;
  const chatId = toTrimmedString(payload.chat_id);
  if (!chatId) return null;

  return {
    chatId,
    senderType: toTrimmedString(payload.sender_type).toLowerCase(),
  };
};

function MessageDetailsScreen({ chatId }: { chatId: string }) {
  const t = useTranslations("MessagesPage");
  const messageApi = useMessage();
  const bookingRoom = useGuestStore((state) => state.bookingRoom);

  const [draftMessage, setDraftMessage] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessageResponse[]>([]);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState("");
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState("");
  const [replyTarget, setReplyTarget] =
    useState<MessageComposerReplyTarget | null>(null);
  const [typingIndicator, setTypingIndicator] =
    useState<TypingIndicatorState | null>(null);

  const chatContainerRef = useRef<HTMLElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const messageNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const hasAutoScrolledRef = useRef(false);
  const scrollRestoreRef = useRef<{ top: number; height: number } | null>(null);
  const hasNextPageRef = useRef(false);
  const isFetchingNextPageRef = useRef(false);
  const highlightTimeoutRef = useRef<number | null>(null);
  const pendingSignatureByLocalIdRef = useRef<Map<string, string>>(new Map());
  const messageLookupRef = useRef<Map<string, ChatMessageResponse>>(new Map());
  const markReadLastSentAtRef = useRef(0);
  const typingLastSentAtRef = useRef(0);
  const typingClearTimeoutRef = useRef<number | null>(null);
  const reactionButtonNodeMapRef = useRef<Map<string, HTMLButtonElement>>(
    new Map(),
  );

  const bookingRoomId = bookingRoom?.id?.trim() || "";
  const roomName = bookingRoom?.room?.name?.trim() || "";
  const bookingNumber = bookingRoom?.booking?.booking_number?.trim() || "";
  const senderName =
    (roomName && bookingNumber
      ? `${roomName} ${bookingNumber}`
      : roomName ||
        bookingNumber ||
        bookingRoom?.code?.trim() ||
        bookingRoomId) || "guest";

  const {
    data,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["guest", "chat", "messages", chatId, CHAT_MESSAGES_PAGE_LIMIT],
    initialPageParam: 1,
    enabled: chatId.length > 0,
    queryFn: async ({ pageParam }) =>
      await getGuestChatMessages(chatId, {
        page: Number(pageParam),
        limit: CHAT_MESSAGES_PAGE_LIMIT,
        includeChat: Number(pageParam) === 1,
      }),
    getNextPageParam: (lastPage) => {
      const meta = lastPage.data?.data?.meta;
      if (!meta?.has_next || typeof meta.page !== "number") return undefined;
      return meta.page + 1;
    },
    staleTime: 0,
  });

  useEffect(() => {
    hasNextPageRef.current = Boolean(hasNextPage);
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (!error) return;
    messageApi.errorFromApi(error);
  }, [error, messageApi]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      if (typingClearTimeoutRef.current) {
        window.clearTimeout(typingClearTimeoutRef.current);
      }
    };
  }, []);

  const chatInfo = useMemo(() => {
    const pages = data?.pages || [];
    for (const page of pages) {
      const chat = page.data?.data?.chat;
      if (chat) return chat;
    }
    return null;
  }, [data?.pages]);

  const departmentId = toTrimmedString(chatInfo?.department?.id);

  const departmentName =
    toTrimmedString(chatInfo?.department?.name) ||
    t("departmentFallback") ||
    t("detail.defaultHeader");

  const baseMessages = useMemo<ChatMessageResponse[]>(() => {
    const flatMessages =
      data?.pages.flatMap((page) => page.data?.data?.messages || []) || [];
    const uniqueById = new Map<string, ChatMessageResponse>();

    for (const message of flatMessages) {
      const messageId = toTrimmedString(message?.id);
      if (!messageId) continue;
      if (!uniqueById.has(messageId)) uniqueById.set(messageId, message);
    }

    return Array.from(uniqueById.values());
  }, [data?.pages]);

  const messages = useMemo(() => {
    const uniqueById = new Map<string, ChatMessageResponse>();

    for (const message of baseMessages) {
      const messageId = toTrimmedString(message?.id);
      if (!messageId) continue;
      uniqueById.set(messageId, message);
    }

    for (const message of liveMessages) {
      const liveChatId = toTrimmedString(message.chat_id);
      if (liveChatId && liveChatId !== chatId) continue;
      const messageId = toTrimmedString(message?.id);
      if (!messageId) continue;
      uniqueById.set(messageId, message);
    }

    // If the server echo has arrived, drop the optimistic local duplicate even
    // if our WS matching failed. This also covers multi-device (same guest)
    // scenarios where the same payload might arrive from another client.
    const list = Array.from(uniqueById.values());
    const serverSignatures = new Set<string>();
    for (const message of list) {
      const messageId = toTrimmedString(message.id);
      if (!messageId || isLocalMessage(messageId)) continue;
      serverSignatures.add(
        buildMessageSignature(message.content, message.attachment_key),
      );
    }

    const filtered = list.filter((message) => {
      const messageId = toTrimmedString(message.id);
      if (!messageId || !isLocalMessage(messageId)) return true;
      const signature = buildMessageSignature(
        message.content,
        message.attachment_key,
      );
      return !serverSignatures.has(signature);
    });

    return filtered.sort((a, b) => {
      const aTime = dayjs(a.created_at);
      const bTime = dayjs(b.created_at);
      const aValid = aTime.isValid();
      const bValid = bTime.isValid();

      if (aValid && bValid && aTime.valueOf() !== bTime.valueOf()) {
        return aTime.valueOf() - bTime.valueOf();
      }

      if (aValid && !bValid) return 1;
      if (!aValid && bValid) return -1;
      return toTrimmedString(a.id).localeCompare(toTrimmedString(b.id));
    });
  }, [baseMessages, chatId, liveMessages]);

  const messageLookup = useMemo(() => {
    const lookup = new Map<string, ChatMessageResponse>();
    for (const message of messages) {
      const messageId = toTrimmedString(message.id);
      if (!messageId) continue;
      lookup.set(messageId, message);
    }
    return lookup;
  }, [messages]);

  useEffect(() => {
    messageLookupRef.current = messageLookup;
  }, [messageLookup]);

  const activeSelectedMessageId =
    selectedMessageId && messageLookup.has(selectedMessageId)
      ? selectedMessageId
      : "";

  const resolveGuestComposerReplyTitle = useCallback(
    (targetSenderType: string) => {
      return targetSenderType === "guest"
        ? t("replyTitles.guest.self")
        : t("replyTitles.guest.department");
    },
    [t],
  );

  const resolveGuestReplyPreviewTitle = useCallback(
    (currentSenderType: string, targetSenderType: string) => {
      if (targetSenderType === "staff")
        return t("replyTitles.guest.department");
      if (currentSenderType === "staff") return t("replyTitles.guest.you");
      return t("replyTitles.guest.self");
    },
    [t],
  );

  const fetchOlderMessages = useCallback(async () => {
    if (!hasNextPageRef.current || isFetchingNextPageRef.current) return false;

    const container = chatContainerRef.current;
    if (container) {
      scrollRestoreRef.current = {
        top: container.scrollTop,
        height: container.scrollHeight,
      };
    }

    await fetchNextPage();
    return true;
  }, [fetchNextPage]);

  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const restore = scrollRestoreRef.current;
    if (restore) {
      const delta = container.scrollHeight - restore.height;
      container.scrollTop = restore.top + delta;
      scrollRestoreRef.current = null;
      return;
    }

    if (!hasAutoScrolledRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
      hasAutoScrolledRef.current = true;
    }
  }, [messages.length]);

  useEffect(() => {
    const root = chatContainerRef.current;
    const target = loadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        void fetchOlderMessages();
      },
      {
        root,
        rootMargin: "120px 0px 0px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchOlderMessages, messages.length]);

  const setMessageNodeRef = useCallback(
    (messageId: string, node: HTMLDivElement | null) => {
      const normalizedId = toTrimmedString(messageId);
      if (!normalizedId) return;

      if (node) {
        messageNodeMapRef.current.set(normalizedId, node);
      } else {
        messageNodeMapRef.current.delete(normalizedId);
      }
    },
    [],
  );

  const setReactionButtonNodeRef = useCallback(
    (messageId: string, node: HTMLButtonElement | null) => {
      const normalizedId = toTrimmedString(messageId);
      if (!normalizedId) return;

      if (node) {
        reactionButtonNodeMapRef.current.set(normalizedId, node);
      } else {
        reactionButtonNodeMapRef.current.delete(normalizedId);
      }
    },
    [],
  );

  const resolveReactionPickerPosition = useCallback((triggerRect: DOMRect) => {
    const viewportWidth =
      window.visualViewport?.width || window.innerWidth || 0;
    const viewportHeight =
      window.visualViewport?.height || window.innerHeight || 0;

    const leftCandidate =
      triggerRect.left -
      REACTION_PICKER_APPROX_WIDTH_PX -
      REACTION_PICKER_GAP_PX;
    const rightCandidate = triggerRect.right + REACTION_PICKER_GAP_PX;

    let left = leftCandidate;
    if (leftCandidate < REACTION_PICKER_MIN_MARGIN_PX) {
      left = rightCandidate;
    }

    if (
      left + REACTION_PICKER_APPROX_WIDTH_PX >
      viewportWidth - REACTION_PICKER_MIN_MARGIN_PX
    ) {
      left =
        viewportWidth -
        REACTION_PICKER_APPROX_WIDTH_PX -
        REACTION_PICKER_MIN_MARGIN_PX;
    }

    if (left < REACTION_PICKER_MIN_MARGIN_PX) {
      left = REACTION_PICKER_MIN_MARGIN_PX;
    }

    let top = triggerRect.top;
    if (
      top + REACTION_PICKER_APPROX_HEIGHT_PX >
      viewportHeight - REACTION_PICKER_MIN_MARGIN_PX
    ) {
      top =
        viewportHeight -
        REACTION_PICKER_APPROX_HEIGHT_PX -
        REACTION_PICKER_MIN_MARGIN_PX;
    }
    if (top < REACTION_PICKER_MIN_MARGIN_PX) {
      top = REACTION_PICKER_MIN_MARGIN_PX;
    }

    return { left, top };
  }, []);

  const handleToggleReactionPicker = useCallback(
    (messageId: string, triggerNode: HTMLButtonElement | null) => {
      const normalizedId = toTrimmedString(messageId);
      if (!normalizedId || !triggerNode) return;

      if (activeReactionMessageId === normalizedId) {
        setActiveReactionMessageId("");
        setReactionPickerPosition(null);
        return;
      }

      const position = resolveReactionPickerPosition(
        triggerNode.getBoundingClientRect(),
      );
      setReactionPickerPosition(position);
      setActiveReactionMessageId(normalizedId);
    },
    [activeReactionMessageId, resolveReactionPickerPosition],
  );

  useEffect(() => {
    if (!activeReactionMessageId) return;

    const updatePickerPosition = () => {
      const triggerNode = reactionButtonNodeMapRef.current.get(
        activeReactionMessageId,
      );
      if (!triggerNode) return;

      const position = resolveReactionPickerPosition(
        triggerNode.getBoundingClientRect(),
      );
      setReactionPickerPosition(position);
    };

    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [activeReactionMessageId, resolveReactionPickerPosition]);

  const handleDownloadAttachment = useCallback(
    async (url: string, fileName: string) => {
      const normalizedUrl = toTrimmedString(url);
      if (!normalizedUrl) return;

      try {
        const response = await fetch(normalizedUrl);
        if (!response.ok) {
          throw new Error("download_failed");
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName || "attachment";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
      } catch {
        window.open(normalizedUrl, "_blank", "noopener,noreferrer");
      }
    },
    [],
  );

  const focusMessage = useCallback((messageId: string) => {
    const normalizedId = toTrimmedString(messageId);
    if (!normalizedId) return false;

    const node = messageNodeMapRef.current.get(normalizedId);
    if (!node) return false;

    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(normalizedId);

    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) =>
        current === normalizedId ? "" : current,
      );
    }, HIGHLIGHT_DURATION_MS);

    return true;
  }, []);

  const handleNavigateToReplyTarget = useCallback(
    async (targetMessageId: string) => {
      const normalizedId = toTrimmedString(targetMessageId);
      if (!normalizedId) return;

      if (focusMessage(normalizedId)) return;

      let attempts = 0;
      while (attempts < MAX_REPLY_LAZY_LOAD_STEPS && hasNextPageRef.current) {
        const loaded = await fetchOlderMessages();
        if (!loaded) break;
        attempts += 1;
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
        if (focusMessage(normalizedId)) return;
      }
    },
    [fetchOlderMessages, focusMessage],
  );

  const findPendingLocalMessageId = useCallback(
    (serverMessage: ChatMessageResponse) => {
      const signature = buildMessageSignature(
        serverMessage.content,
        serverMessage.attachment_key,
      );

      for (const [
        localId,
        localSignature,
      ] of pendingSignatureByLocalIdRef.current) {
        if (localSignature === signature) {
          return localId;
        }
      }

      const first = pendingSignatureByLocalIdRef.current.keys().next();
      return first.done ? "" : String(first.value);
    },
    [],
  );

  const patchMessageById = useCallback(
    (
      messageId: string,
      updater: (message: ChatMessageResponse) => ChatMessageResponse,
    ) => {
      const normalizedId = toTrimmedString(messageId);
      if (!normalizedId) return;

      setLiveMessages((previous) => {
        const fromLive = previous.find((item) => item.id === normalizedId);
        const baseMessage =
          fromLive || messageLookupRef.current.get(normalizedId);
        if (!baseMessage) return previous;

        const updatedMessage = updater(baseMessage);
        return [
          ...previous.filter((item) => item.id !== normalizedId),
          updatedMessage,
        ];
      });
    },
    [],
  );

  const sendMarkReadIfNeeded = useCallback(
    (force = false) => {
      if (!chatId || !departmentId || !bookingRoomId || !senderName) return;

      const now = Date.now();
      if (!force && now - markReadLastSentAtRef.current < 650) return;
      markReadLastSentAtRef.current = now;

      try {
        sendMarkReadEvent({
          chat_id: chatId,
          department_id: departmentId,
          booking_room_id: bookingRoomId,
          reader_name: senderName,
          reader_type: "guest",
          reader_id: bookingRoomId,
        });
      } catch {
        // Ignore mark-read send failures; it will retry on next incoming event.
      }
    },
    [bookingRoomId, chatId, departmentId, senderName],
  );

  const notifyTyping = useCallback(() => {
    if (!chatId || !departmentId || !bookingRoomId) return;

    const now = Date.now();
    if (now - typingLastSentAtRef.current < 850) return;
    typingLastSentAtRef.current = now;

    sendTypingEvent({
      chat_id: chatId,
      department_id: departmentId,
      booking_room_id: bookingRoomId,
      sender_type: "guest",
    });
  }, [bookingRoomId, chatId, departmentId]);

  const handleSelectReaction = useCallback(
    (messageId: string, emoji: ReactionEmojiType) => {
      if (!chatId || !departmentId || !bookingRoomId || !senderName) return;

      patchMessageById(messageId, (message) => {
        const reactions = Array.isArray(message.message_reaction)
          ? [...message.message_reaction]
          : [];
        const myReactionIndex = reactions.findIndex((reaction) => {
          return (
            toTrimmedString(reaction?.sender_type).toLowerCase() === "guest" &&
            toTrimmedString(reaction?.sender_id) === bookingRoomId
          );
        });

        const currentEmoji =
          myReactionIndex >= 0
            ? toTrimmedString(reactions[myReactionIndex]?.emoji).toLowerCase()
            : "";
        const shouldUnreact = myReactionIndex >= 0 && currentEmoji === emoji;

        if (shouldUnreact) {
          reactions.splice(myReactionIndex, 1);
        } else {
          const nextReaction = {
            sender_type: "guest",
            sender_id: bookingRoomId,
            sender_name: senderName,
            emoji,
            created_at: dayjs().toISOString(),
          };

          if (myReactionIndex >= 0) {
            reactions[myReactionIndex] = nextReaction;
          } else {
            reactions.push(nextReaction);
          }
        }

        return {
          ...message,
          message_reaction: reactions,
        };
      });

      setActiveReactionMessageId("");
      setReactionPickerPosition(null);

      try {
        sendReactionEvent({
          message_id: messageId,
          chat_id: chatId,
          department_id: departmentId,
          booking_room_id: bookingRoomId,
          sender_id: bookingRoomId,
          sender_type: "guest",
          sender_name: senderName,
          emoji,
        });
      } catch (error) {
        messageApi.errorFromApi(error, t("composer.sendFailed"));
      }
    },
    [
      bookingRoomId,
      chatId,
      departmentId,
      messageApi,
      patchMessageById,
      senderName,
      t,
    ],
  );

  const sendSingleMessage = useCallback(
    async (messageData: {
      content?: string;
      attachment_type?: PreviewAttachmentType;
      attachment_key?: string;
      message_id?: string;
      message_reply?: ChatMessageResponse["message_reply"];
    }) => {
      if (!chatId || !departmentId || !bookingRoomId || !senderName) {
        throw new Error("missing_message_context");
      }

      const localMessageId = createLocalMessageId();
      const optimisticMessage: ChatMessageResponse = {
        id: localMessageId,
        chat_id: chatId,
        sender_type: "guest",
        sender_id: bookingRoomId,
        sender_name: senderName,
        content: toNullableTrimmedString(messageData.content),
        attachment_type: messageData.attachment_type || null,
        attachment_key: toNullableTrimmedString(messageData.attachment_key),
        created_at: dayjs().toISOString(),
        message_users: [],
        message_reaction: [],
        message_reply: messageData.message_reply || null,
      };

      setLiveMessages((prev) => [...prev, optimisticMessage]);
      // Ensure the freshly sent message is visible above the composer.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToBottom();
        });
      });
      pendingSignatureByLocalIdRef.current.set(
        localMessageId,
        buildMessageSignature(
          optimisticMessage.content,
          optimisticMessage.attachment_key,
        ),
      );

      try {
        await sendNewMessageEvent({
          content: optimisticMessage.content || undefined,
          attachment_type: optimisticMessage.attachment_type as
            | PreviewAttachmentType
            | undefined,
          attachment_key: optimisticMessage.attachment_key || undefined,
          department_id: departmentId,
          booking_room_id: bookingRoomId,
          sender_id: bookingRoomId,
          sender_type: "guest",
          sender_name: senderName,
          chat_id: chatId,
          message_id: toTrimmedString(messageData.message_id) || undefined,
        });
      } catch (error) {
        pendingSignatureByLocalIdRef.current.delete(localMessageId);
        setLiveMessages((prev) =>
          prev.filter((item) => item.id !== localMessageId),
        );
        throw error;
      }
    },
    [bookingRoomId, chatId, departmentId, scrollToBottom, senderName],
  );

  const handleSendMessage = useCallback(
    async ({ text, attachment }: MessageComposerSubmitPayload) => {
      const trimmedText = text.trim();
      if (!trimmedText && !attachment) return;

      const replyMessageId = toTrimmedString(replyTarget?.messageId);
      const replyPreview = replyMessageId
        ? {
            message_id: replyMessageId,
            sender_name: toTrimmedString(replyTarget?.senderName) || undefined,
            content: toTrimmedString(replyTarget?.content) || null,
            attachment_type: null,
          }
        : null;

      let attachmentKey = "";
      let attachmentType: PreviewAttachmentType | undefined;

      if (attachment) {
        attachmentType = resolveAttachmentType(attachment);
        const uploadResults = await uploadFilesWithPresignedURLs([
          { file: attachment },
        ]);

        attachmentKey = toTrimmedString(uploadResults[0]?.key);
        if (!attachmentKey) {
          throw new Error("missing_attachment_key");
        }
      }

      if (trimmedText) {
        await sendSingleMessage({
          content: trimmedText,
          message_id: replyMessageId || undefined,
          message_reply: replyPreview,
        });
      }

      if (attachmentType && attachmentKey) {
        await sendSingleMessage({
          attachment_type: attachmentType,
          attachment_key: attachmentKey,
          message_id: replyMessageId || undefined,
          message_reply: replyPreview,
        });
      }

      setReplyTarget(null);
    },
    [replyTarget, sendSingleMessage],
  );

  useEffect(() => {
    if (!chatId || !departmentId || !bookingRoomId) return;
    sendMarkReadIfNeeded(true);
  }, [
    bookingRoomId,
    chatId,
    departmentId,
    messages.length,
    sendMarkReadIfNeeded,
  ]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribe = subscribeWebSocket({
      onEvent: (payload) => {
        if (payload.event === "new_message") {
          const payloadData = toRecord(payload.data);
          const serverMessage = normalizeWsMessage(
            payloadData?.message || payload.data,
          );
          if (!serverMessage) return;

          const serverChatId = toTrimmedString(serverMessage.chat_id);
          if (!serverChatId || serverChatId !== chatId) return;

          const serverSenderType = toTrimmedString(
            serverMessage.sender_type,
          ).toLowerCase();
          const serverSenderId = toTrimmedString(serverMessage.sender_id);

          const isSelfGuestMessage =
            serverSenderType === "guest" && serverSenderId === bookingRoomId;

          setLiveMessages((previous) => {
            if (previous.some((message) => message.id === serverMessage.id)) {
              return previous;
            }

            if (isSelfGuestMessage) {
              const pendingLocalId = findPendingLocalMessageId(serverMessage);
              if (pendingLocalId) {
                pendingSignatureByLocalIdRef.current.delete(pendingLocalId);
                return [
                  ...previous.filter(
                    (message) =>
                      message.id !== pendingLocalId &&
                      message.id !== serverMessage.id,
                  ),
                  serverMessage,
                ];
              }
            }

            return [...previous, serverMessage];
          });

          if (serverSenderType === "staff") {
            sendMarkReadIfNeeded();
            window.requestAnimationFrame(() => {
              scrollToBottom();
            });
          }

          return;
        }

        if (payload.event === "reaction") {
          const reactionPayload = normalizeReactionPayload(payload.data);
          if (!reactionPayload || reactionPayload.chatId !== chatId) return;

          patchMessageById(reactionPayload.messageId, (message) => ({
            ...message,
            message_reaction: reactionPayload.messageReactions || [],
          }));
          return;
        }

        if (payload.event === "mark_read" || payload.event === "read") {
          const readPayload = normalizeReadPayload(payload.data);
          if (!readPayload || readPayload.chatId !== chatId) return;
          if (readPayload.readerType !== "staff") return;

          const readAt = dayjs().toISOString();
          setLiveMessages((previous) => {
            const nextMap = new Map<string, ChatMessageResponse>();

            for (const message of messageLookupRef.current.values()) {
              const messageId = toTrimmedString(message.id);
              if (!messageId) continue;

              const senderType = toTrimmedString(
                message.sender_type,
              ).toLowerCase();
              if (senderType !== "guest") {
                nextMap.set(messageId, message);
                continue;
              }

              const existingUsers = Array.isArray(message.message_users)
                ? [...message.message_users]
                : [];
              const hasReader = existingUsers.some((item) => {
                return (
                  toTrimmedString(item?.sender_type).toLowerCase() ===
                    "staff" &&
                  toTrimmedString(item?.sender_id) === readPayload.readerId
                );
              });

              const nextUsers = hasReader
                ? existingUsers.map((item) => {
                    if (
                      toTrimmedString(item?.sender_type).toLowerCase() ===
                        "staff" &&
                      toTrimmedString(item?.sender_id) === readPayload.readerId
                    ) {
                      return {
                        ...item,
                        read_at: item?.read_at || readAt,
                      };
                    }
                    return item;
                  })
                : [
                    ...existingUsers,
                    {
                      sender_type: "staff",
                      sender_id: readPayload.readerId,
                      sender_name:
                        readPayload.readerName || STAFF_SENDER_NAME_FOR_GUEST,
                      read_at: readAt,
                    },
                  ];

              nextMap.set(messageId, {
                ...message,
                message_users: nextUsers,
              });
            }

            for (const message of previous) {
              const messageId = toTrimmedString(message.id);
              if (!messageId || nextMap.has(messageId)) continue;
              nextMap.set(messageId, message);
            }

            return Array.from(nextMap.values());
          });
          return;
        }

        if (payload.event === "typing") {
          const typingPayload = normalizeTypingPayload(payload.data);
          if (!typingPayload || typingPayload.chatId !== chatId) return;
          if (typingPayload.senderType === "guest") return;

          setTypingIndicator({
            senderName: STAFF_SENDER_NAME_FOR_GUEST,
          });
          if (typingClearTimeoutRef.current) {
            window.clearTimeout(typingClearTimeoutRef.current);
          }
          typingClearTimeoutRef.current = window.setTimeout(() => {
            setTypingIndicator(null);
          }, TYPING_INDICATOR_TIMEOUT_MS);
        }
      },
    });

    return unsubscribe;
  }, [
    bookingRoomId,
    chatId,
    findPendingLocalMessageId,
    patchMessageById,
    sendMarkReadIfNeeded,
    scrollToBottom,
  ]);

  const handleStartReply = useCallback(
    (message: ChatMessageResponse) => {
      const messageId = toTrimmedString(message.id);
      if (!messageId) return;

      const senderType = toTrimmedString(message.sender_type).toLowerCase();
      const replyTitle = resolveGuestComposerReplyTitle(senderType);
      const replySenderName =
        senderType === "guest"
          ? toTrimmedString(message.sender_name) || senderName || "guest"
          : STAFF_SENDER_NAME_FOR_GUEST;
      const replyContent =
        toTrimmedString(message.content) ||
        resolveAttachmentLabel(message.attachment_type, "[Tin nhắn]");

      setReplyTarget({
        messageId,
        title: replyTitle,
        senderName: replySenderName,
        content: replyContent,
      });
      setActiveReactionMessageId("");
      setReactionPickerPosition(null);
    },
    [resolveGuestComposerReplyTitle, senderName],
  );

  const renderDeliveryStatus = (message: ChatMessageResponse) => {
    const senderType = toTrimmedString(message.sender_type).toLowerCase();
    if (senderType !== "guest") return null;

    const isSending = isLocalMessage(message.id);
    if (isSending) return null;

    const isRead =
      Array.isArray(message.message_users) && message.message_users.length > 0;

    if (isRead) {
      return (
        <span className="inline-flex items-center text-[#16a34a]">
          <FiCheck className="h-3 w-3" />
          <FiCheck className="-ml-1 h-3 w-3" />
        </span>
      );
    }

    return (
      <span className="inline-flex items-center text-[#9ca3af]">
        <FiCheck className="h-3 w-3" />
      </span>
    );
  };

  const renderMessageReactions = (message: ChatMessageResponse) => {
    const reactions = Array.isArray(message.message_reaction)
      ? message.message_reaction
      : [];
    if (reactions.length === 0) return null;

    const reactionCount = new Map<string, number>();
    for (const reaction of reactions) {
      const emojiKey = toTrimmedString(reaction?.emoji).toLowerCase();
      if (!emojiKey) continue;
      reactionCount.set(emojiKey, (reactionCount.get(emojiKey) || 0) + 1);
    }

    const entries = Array.from(reactionCount.entries());
    if (entries.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {entries.map(([emoji, count]) => (
          <span
            key={`${message.id}-${emoji}`}
            className="inline-flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-white px-2 py-[2px] text-xs text-[#4b5563]"
          >
            <span>{resolveReactionEmoji(emoji)}</span>
            <span>{count}</span>
          </span>
        ))}
      </div>
    );
  };

  const renderReactionPicker = (messageId: string) => {
    const isOpen = activeReactionMessageId === messageId;
    if (!isOpen || !reactionPickerPosition) return null;

    return (
      <div
        className="fixed z-30 flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-white px-2 py-1 shadow-[0_6px_16px_rgba(15,23,42,0.16)]"
        style={{
          left: `${reactionPickerPosition.left}px`,
          top: `${reactionPickerPosition.top}px`,
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {REACTION_PICKER_OPTIONS.map((emoji) => (
          <button
            key={`${messageId}-${emoji}`}
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-base transition-transform hover:scale-110 active:scale-95"
            onClick={(event) => {
              event.stopPropagation();
              handleSelectReaction(messageId, emoji);
            }}
            aria-label={`reaction-${emoji}`}
          >
            {resolveReactionEmoji(emoji)}
          </button>
        ))}
      </div>
    );
  };

  const renderReplyPreview = (message: ChatMessageResponse) => {
    const reply = message.message_reply;
    const replyMessageId = toTrimmedString(reply?.message_id);
    if (!reply || !replyMessageId) return null;

    const currentSenderType = toTrimmedString(
      message.sender_type,
    ).toLowerCase();
    const replyTargetMessage = messageLookup.get(replyMessageId);
    const replySenderType = toTrimmedString(
      replyTargetMessage?.sender_type,
    ).toLowerCase();
    const fallbackSenderName = toTrimmedString(reply.sender_name);
    const inferredSenderType =
      replySenderType ||
      (fallbackSenderName && fallbackSenderName === senderName
        ? "guest"
        : "staff");
    const replyTitle = resolveGuestReplyPreviewTitle(
      currentSenderType || "guest",
      inferredSenderType || "guest",
    );
    const replyContent =
      toTrimmedString(reply.content) ||
      resolveAttachmentLabel(reply.attachment_type, "[Tin nhắn]");

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void handleNavigateToReplyTarget(replyMessageId);
        }}
        className="mb-2 w-full rounded-xl border border-[#f3e8ff] bg-[#faf5ff] px-3 py-2 text-left transition-colors hover:bg-[#f5edff]"
      >
        <p className="truncate text-xs font-semibold text-[#7c3aed]">
          {replyTitle}
        </p>
        <p className="mt-1 truncate text-xs text-[#6b7280]">{replyContent}</p>
      </button>
    );
  };

  return (
    <div className="mx-auto flex h-screen w-full max-w-screen-sm flex-col bg-white">
      <MessageHeader departmentName={departmentName} />

      <section
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(140px+env(safe-area-inset-bottom))]"
      >
        <div ref={loadMoreRef} className="h-1" />

        {isFetchingNextPage ? (
          <p className="mb-3 text-center text-xs font-medium text-[#9ca3af]">
            {t("loadingMore")}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="h-12 w-[70%] animate-pulse rounded-2xl bg-[#f3f4f6]" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="mt-8 flex justify-center">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-sm text-[#6b7280]">
              {t("emptyPreview")}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const messageId = toTrimmedString(message.id);
            const senderType = toTrimmedString(
              message.sender_type,
            ).toLowerCase();
            const isGuestMessage = senderType === "guest";
            const isSending = isGuestMessage && isLocalMessage(messageId);
            const textContent = toTrimmedString(message.content);
            const attachmentType = toTrimmedString(
              message.attachment_type,
            ).toLowerCase();
            const attachmentKey = toTrimmedString(message.attachment_key);
            const attachmentUrl = resolvePublicImageUrl(attachmentKey);
            const attachmentFileName =
              attachmentKey.split("/").filter(Boolean).pop() || attachmentKey;
            const messageTime = parseMessageTime(message.created_at);
            const timelineTime =
              parseTimelineTime(message.created_at) ||
              parseTimelineTime(dayjs().toISOString());
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const currentCreatedAt = dayjs(message.created_at);
            const previousCreatedAt = dayjs(previousMessage?.created_at);
            const shouldShowTimelineSeparator =
              index === 0 ||
              !currentCreatedAt.isValid() ||
              !previousCreatedAt.isValid() ||
              currentCreatedAt.diff(previousCreatedAt, "minute") >
                TIMELINE_SEPARATOR_GAP_MINUTES;
            const isHighlighted = highlightedMessageId === messageId;
            const isSelectedMessage = activeSelectedMessageId === messageId;
            const canInteractWithMessage =
              !isSending && !isLocalMessage(messageId);
            const shouldShowMessageActions =
              canInteractWithMessage &&
              (activeActionMessageId === messageId ||
                activeReactionMessageId === messageId);

            return (
              <div key={messageId}>
                {shouldShowTimelineSeparator ? (
                  <p
                    className={`text-center text-xs font-semibold text-[#9ca3af] ${
                      index === 0 ? "mb-2 mt-0" : "mb-2 mt-4"
                    }`}
                  >
                    {timelineTime}
                  </p>
                ) : null}

                <div
                  ref={(node) => setMessageNodeRef(messageId, node)}
                  className={`mt-3 flex items-end ${isGuestMessage ? "justify-end" : "justify-start"}`}
                >
                  {isSending ? (
                    <div className="mb-3 mr-2 mt-auto inline-flex h-3 w-3 animate-spin rounded-full border border-[#9ca3af] border-t-transparent" />
                  ) : null}

                  <div
                    className={`flex max-w-full items-end gap-2 ${
                      isGuestMessage ? "flex-row-reverse" : ""
                    }`}
                    onMouseEnter={() => {
                      setActiveActionMessageId(messageId);
                      setActiveReactionMessageId((current) => {
                        if (!current || current === messageId) return current;
                        setReactionPickerPosition(null);
                        return "";
                      });
                    }}
                    onMouseLeave={() => {
                      setActiveActionMessageId((current) =>
                        current === messageId ? "" : current,
                      );
                    }}
                    onClick={() => {
                      setSelectedMessageId((current) =>
                        current === messageId ? "" : messageId,
                      );

                      if (!canInteractWithMessage) {
                        setActiveActionMessageId("");
                        setActiveReactionMessageId("");
                        setReactionPickerPosition(null);
                        return;
                      }

                      setActiveActionMessageId(messageId);
                      setActiveReactionMessageId((current) => {
                        if (!current || current === messageId) return current;
                        setReactionPickerPosition(null);
                        return "";
                      });
                    }}
                  >
                    <div
                      className={`flex min-w-0 max-w-[82%] flex-col ${
                        isGuestMessage ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`w-full rounded-2xl px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${
                          isGuestMessage
                            ? "rounded-br-md border border-[#fde68a] bg-[#fff7cc]"
                            : "rounded-bl-md border border-[#e5e7eb] bg-[#f3f4f6]"
                        } ${isHighlighted ? "ring-2 ring-[#f59e0b]/60" : ""}`}
                      >
                        {renderReplyPreview(message)}

                        {textContent ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-[#111827]">
                            {textContent}
                          </p>
                        ) : null}

                        {attachmentKey ? (
                          <div className={textContent ? "mt-2" : ""}>
                            {attachmentType === "image" && attachmentUrl ? (
                              <AntImage
                                src={attachmentUrl}
                                alt={attachmentFileName || "attachment"}
                                className="max-h-64 w-full cursor-zoom-in overflow-hidden rounded-xl"
                                style={{
                                  maxHeight: 256,
                                  width: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!attachmentUrl) return;
                                  void handleDownloadAttachment(
                                    attachmentUrl,
                                    attachmentFileName ||
                                      resolveAttachmentLabel(
                                        message.attachment_type,
                                        "attachment",
                                      ),
                                  );
                                }}
                                className="flex w-full items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-2 py-2 text-left transition-colors hover:bg-[#f9fafb]"
                                aria-label="Download attachment"
                                disabled={!attachmentUrl}
                              >
                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3f4f6] text-[#6b7280]">
                                  <FiFileText className="h-4 w-4" />
                                </div>
                                <p className="min-w-0 truncate text-xs text-[#111827]">
                                  {attachmentFileName ||
                                    resolveAttachmentLabel(
                                      message.attachment_type,
                                      "[Tệp đính kèm]",
                                    )}
                                </p>
                              </button>
                            )}
                          </div>
                        ) : null}

                        {renderMessageReactions(message)}
                      </div>
                    </div>

                    {canInteractWithMessage ? (
                      <div
                        className={`relative mb-1 flex h-7 w-7 shrink-0 self-end transition-opacity ${
                          shouldShowMessageActions
                            ? "opacity-100"
                            : "pointer-events-none opacity-0"
                        }`}
                      >
                        <div
                          className={`absolute top-0 flex items-center gap-1 ${
                            isGuestMessage ? "right-0" : "left-0"
                          }`}
                        >
                          {renderReactionPicker(messageId)}
                          <button
                            type="button"
                            ref={(node) =>
                              setReactionButtonNodeRef(messageId, node)
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:text-[#111827]"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleReactionPicker(
                                messageId,
                                event.currentTarget,
                              );
                            }}
                            aria-label="Open reactions"
                          >
                            <FiSmile className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors hover:text-[#111827]"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleStartReply(message);
                            }}
                            aria-label="Reply message"
                          >
                            <FiCornerUpLeft className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {isSelectedMessage ? (
                  <div
                    className={`mt-1 flex ${isGuestMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[82%] px-1 text-[11px] text-[#9ca3af]">
                      <div
                        className={`inline-flex items-center gap-1 ${
                          isGuestMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span>{messageTime || "--:--"}</span>
                        {renderDeliveryStatus(message)}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {typingIndicator ? (
          <div className="mt-4 flex items-end">
            <div className="rounded-2xl rounded-bl-md border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-2">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#9ca3af]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#9ca3af] [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#9ca3af] [animation-delay:240ms]" />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <MessageComposer
        value={draftMessage}
        onChange={setDraftMessage}
        placeholder={t("composerPlaceholder")}
        onSend={handleSendMessage}
        replyTarget={replyTarget}
        onCancelReply={() => setReplyTarget(null)}
        onComposerFocus={notifyTyping}
        onUserTyping={notifyTyping}
      />
    </div>
  );
}

export default function MessageDetailsPage() {
  const params = useParams<{ id: string }>();
  const chatId = params?.id?.trim() || "";
  return <MessageDetailsScreen key={chatId || "guest-chat"} chatId={chatId} />;
}
