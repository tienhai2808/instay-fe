"use client";

import { getAdminChatMessages } from "@/apis/chat";
import { useMessage } from "@/providers/MessageProvider";
import {
  sendWebSocketMessage,
  sendWebSocketMessageWithRetry,
  subscribeWebSocket,
} from "@/services/websocket";
import { useAuthStore } from "@/stores/useAuthStore";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiCornerUpLeft, FiFileText, FiSmile } from "react-icons/fi";
import MessageComposer, {
  MessageComposerReplyTarget,
  MessageComposerSubmitPayload,
} from "./Composer";
import MessageHeader from "./Header";
import {
  CHAT_MESSAGES_PAGE_LIMIT,
  buildMessageSignature,
  createLocalMessageId,
  isLocalMessage,
  resolveAttachmentType,
  resolveBookingRoomDisplayName,
  resolveMessageTime,
  resolveTimelineTime,
  toNullableTrimmedString,
  toRecord,
  toTrimmedString,
} from "../utils/chat-utils";

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
const CHAT_EXPIRY_GRACE_MS = 0;
const TIMELINE_SEPARATOR_GAP_MINUTES = 10;
const METADATA_HINT_DELAY_MS = 420;

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
  message_id?: string;
  chat_id?: string;
  booking_room_id: string;
  sender_id: string;
  sender_type: "staff";
  sender_name: string;
  department_id?: string;
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
  sender_type: "staff";
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
  reader_type: "staff";
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
  sender_type: "staff";
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

interface ChatDetailProps {
  chatId: string;
  floatingComposerOnMobile?: boolean;
  showBackButton?: boolean;
}

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

function ChatDetailScreen({
  chatId,
  floatingComposerOnMobile = false,
  showBackButton = false,
}: ChatDetailProps) {
  const t = useTranslations("MessagesPage");
  const messageApi = useMessage();
  const user = useAuthStore((state) => state.user);

  const [draftMessage, setDraftMessage] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [liveMessages, setLiveMessages] = useState<ChatMessageResponse[]>([]);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState("");
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState("");
  const [activeMetadataMessageId, setActiveMetadataMessageId] = useState("");
  const [replyTarget, setReplyTarget] =
    useState<MessageComposerReplyTarget | null>(null);
  const [typingIndicator, setTypingIndicator] =
    useState<TypingIndicatorState | null>(null);

  const currentStaffId = toTrimmedString(user?.id);
  const currentRole = toTrimmedString(user?.role).toLowerCase();
  const currentStaffName =
    toTrimmedString(user?.username) ||
    [toTrimmedString(user?.first_name), toTrimmedString(user?.last_name)]
      .filter(Boolean)
      .join(" ") ||
    toTrimmedString(user?.email) ||
    "staff";
  const currentDepartmentId = toTrimmedString(user?.department?.id);
  const canInteractByRole =
    currentRole !== "admin" &&
    currentDepartmentId.length > 0 &&
    currentStaffId.length > 0;

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
  const metadataHintTimeoutRef = useRef<number | null>(null);
  const reactionButtonNodeMapRef = useRef<Map<string, HTMLButtonElement>>(
    new Map(),
  );

  const {
    data,
    error,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["staff", "chat", "messages", chatId, CHAT_MESSAGES_PAGE_LIMIT],
    initialPageParam: 1,
    enabled: chatId.length > 0,
    queryFn: async ({ pageParam }) =>
      await getAdminChatMessages(chatId, {
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
      if (metadataHintTimeoutRef.current) {
        window.clearTimeout(metadataHintTimeoutRef.current);
      }
    };
  }, []);

  const clearMetadataHintTimeout = useCallback(() => {
    if (!metadataHintTimeoutRef.current) return;
    window.clearTimeout(metadataHintTimeoutRef.current);
    metadataHintTimeoutRef.current = null;
  }, []);

  const queueMetadataHint = useCallback(
    (messageId: string) => {
      const normalizedMessageId = toTrimmedString(messageId);
      clearMetadataHintTimeout();
      if (!normalizedMessageId) {
        setActiveMetadataMessageId("");
        return;
      }

      metadataHintTimeoutRef.current = window.setTimeout(() => {
        setActiveMetadataMessageId(normalizedMessageId);
        metadataHintTimeoutRef.current = null;
      }, METADATA_HINT_DELAY_MS);
    },
    [clearMetadataHintTimeout],
  );

  const chatInfo = useMemo(() => {
    const pages = data?.pages || [];
    for (const page of pages) {
      const chat = page.data?.data?.chat;
      if (chat) return chat;
    }
    return null;
  }, [data?.pages]);

  const bookingRoomId = toTrimmedString(chatInfo?.booking_room?.id);
  const guestDisplayName =
    toTrimmedString(chatInfo?.booking_room?.booking?.guest_full_name) ||
    "Guest";
  const chatTitle = resolveBookingRoomDisplayName(
    chatInfo?.booking_room,
    t("detail.defaultHeader"),
  );
  const isChatExpired = useMemo(() => {
    const expiredAt = toTrimmedString(chatInfo?.expired_at);
    if (!expiredAt) return false;

    const expiredMs = new Date(expiredAt).getTime();
    if (Number.isNaN(expiredMs)) return false;

    return dayjs().valueOf() + CHAT_EXPIRY_GRACE_MS >= expiredMs;
  }, [chatInfo?.expired_at]);
  const canInteract = canInteractByRole && !isChatExpired;

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

  useEffect(() => {
    const lookup = new Map<string, ChatMessageResponse>();
    for (const message of messages) {
      const messageId = toTrimmedString(message.id);
      if (!messageId) continue;
      lookup.set(messageId, message);
    }
    messageLookupRef.current = lookup;
  }, [messages]);

  const resolveStaffReplyTitle = useCallback(() => {
    return t("replyTitles.staff.you");
  }, [t]);

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
      if (!canInteract || !chatId || !bookingRoomId) return;

      const now = Date.now();
      if (!force && now - markReadLastSentAtRef.current < 650) return;
      markReadLastSentAtRef.current = now;

      try {
        sendMarkReadEvent({
          chat_id: chatId,
          department_id: currentDepartmentId,
          booking_room_id: bookingRoomId,
          reader_id: currentStaffId,
          reader_name: currentStaffName,
          reader_type: "staff",
        });
      } catch {
        // Ignore mark-read send failures; it will retry on next incoming event.
      }
    },
    [
      bookingRoomId,
      canInteract,
      chatId,
      currentDepartmentId,
      currentStaffId,
      currentStaffName,
    ],
  );

  const notifyTyping = useCallback(() => {
    if (!canInteract || !chatId || !bookingRoomId) return;

    const now = Date.now();
    if (now - typingLastSentAtRef.current < 850) return;
    typingLastSentAtRef.current = now;

    sendTypingEvent({
      chat_id: chatId,
      department_id: currentDepartmentId,
      booking_room_id: bookingRoomId,
      sender_type: "staff",
    });
  }, [bookingRoomId, canInteract, chatId, currentDepartmentId]);

  const handleSelectReaction = useCallback(
    (messageId: string, emoji: ReactionEmojiType) => {
      if (!canInteract || !chatId || !bookingRoomId) return;

      patchMessageById(messageId, (message) => {
        const reactions = Array.isArray(message.message_reaction)
          ? [...message.message_reaction]
          : [];
        const myReactionIndex = reactions.findIndex((reaction) => {
          return (
            toTrimmedString(reaction?.sender_type).toLowerCase() === "staff" &&
            toTrimmedString(reaction?.sender_id) === currentStaffId
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
            sender_type: "staff",
            sender_id: currentStaffId,
            sender_name: currentStaffName,
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
          department_id: currentDepartmentId,
          booking_room_id: bookingRoomId,
          sender_id: currentStaffId,
          sender_type: "staff",
          sender_name: currentStaffName,
          emoji,
        });
      } catch (error) {
        messageApi.errorFromApi(error, t("composer.sendFailed"));
      }
    },
    [
      bookingRoomId,
      canInteract,
      chatId,
      currentDepartmentId,
      currentStaffId,
      currentStaffName,
      messageApi,
      patchMessageById,
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
      if (
        !canInteract ||
        !chatId ||
        !bookingRoomId ||
        !currentStaffId ||
        !currentStaffName ||
        !currentDepartmentId
      ) {
        throw new Error("missing_message_context");
      }

      const localMessageId = createLocalMessageId();
      const optimisticMessage: ChatMessageResponse = {
        id: localMessageId,
        chat_id: chatId,
        sender_type: "staff",
        sender_id: currentStaffId,
        sender_name: currentStaffName,
        content: toNullableTrimmedString(messageData.content),
        attachment_type: messageData.attachment_type || null,
        attachment_key: toNullableTrimmedString(messageData.attachment_key),
        created_at: dayjs().toISOString(),
        message_users: [],
        message_reaction: [],
        message_reply: messageData.message_reply || null,
      };

      setLiveMessages((prev) => [...prev, optimisticMessage]);

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
          booking_room_id: bookingRoomId,
          sender_id: currentStaffId,
          sender_type: "staff",
          sender_name: currentStaffName,
          chat_id: chatId,
          department_id: currentDepartmentId,
          message_id: toTrimmedString(messageData.message_id) || undefined,
        });
      } catch (sendError) {
        pendingSignatureByLocalIdRef.current.delete(localMessageId);
        setLiveMessages((prev) =>
          prev.filter((message) => message.id !== localMessageId),
        );
        throw sendError;
      }
    },
    [
      bookingRoomId,
      canInteract,
      chatId,
      currentDepartmentId,
      currentStaffId,
      currentStaffName,
      scrollToBottom,
    ],
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
    if (!canInteract || !chatId || !bookingRoomId) return;
    sendMarkReadIfNeeded(true);
  }, [
    bookingRoomId,
    canInteract,
    chatId,
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

          const isSelfStaffMessage =
            serverSenderType === "staff" && serverSenderId === currentStaffId;

          setLiveMessages((previous) => {
            if (previous.some((message) => message.id === serverMessage.id)) {
              return previous;
            }

            if (isSelfStaffMessage) {
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

          if (serverSenderType === "guest") {
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
          if (readPayload.readerType !== "guest") return;

          const readAt = dayjs().toISOString();
          setLiveMessages((previous) => {
            const nextMap = new Map<string, ChatMessageResponse>();

            for (const message of messageLookupRef.current.values()) {
              const messageId = toTrimmedString(message.id);
              if (!messageId) continue;

              const senderType = toTrimmedString(
                message.sender_type,
              ).toLowerCase();
              if (senderType !== "staff") {
                nextMap.set(messageId, message);
                continue;
              }

              nextMap.set(messageId, {
                ...message,
                booking_room_read_at:
                  toTrimmedString(message.booking_room_read_at) || readAt,
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
          if (typingPayload.senderType !== "guest") return;

          setTypingIndicator({
            senderName: guestDisplayName || t("detail.defaultHeader"),
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
    chatId,
    currentStaffId,
    findPendingLocalMessageId,
    guestDisplayName,
    patchMessageById,
    sendMarkReadIfNeeded,
    scrollToBottom,
    t,
  ]);

  const handleStartReply = useCallback(
    (message: ChatMessageResponse) => {
      const messageId = toTrimmedString(message.id);
      if (!messageId || !canInteract) return;

      const senderType = toTrimmedString(message.sender_type).toLowerCase();
      const replySenderName =
        senderType === "guest"
          ? toTrimmedString(message.sender_name) || guestDisplayName
          : toTrimmedString(message.sender_name) ||
            currentStaffName ||
            t("staffTitle");
      const replyContent =
        toTrimmedString(message.content) ||
        resolveAttachmentLabel(message.attachment_type, "[Tin nhắn]");

      setReplyTarget({
        messageId,
        title: resolveStaffReplyTitle(),
        senderName: replySenderName,
        content: replyContent,
      });
      setActiveReactionMessageId("");
      setReactionPickerPosition(null);
    },
    [
      canInteract,
      currentStaffName,
      guestDisplayName,
      resolveStaffReplyTitle,
      t,
    ],
  );

  const renderDeliveryStatus = (
    message: ChatMessageResponse,
    isOutgoing: boolean,
  ) => {
    if (!isOutgoing) return null;

    const isSending = isLocalMessage(message.id);
    if (isSending) return null;

    const isRead = Boolean(
      toTrimmedString(message.booking_room_read_at) ||
      (Array.isArray(message.message_users) &&
        message.message_users.length > 0),
    );

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
    if (!isOpen || !canInteract || !reactionPickerPosition) return null;

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

    const replyTitle = resolveStaffReplyTitle();
    const replyContent =
      toTrimmedString(reply.content) ||
      resolveAttachmentLabel(reply.attachment_type, "[Tin nhắn]");

    if (!canInteract) {
      return (
        <div className="mb-2 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left">
          <p className="truncate text-xs font-semibold text-[#374151]">
            {replyTitle}
          </p>
          <p className="mt-1 truncate text-xs text-[#6b7280]">{replyContent}</p>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void handleNavigateToReplyTarget(replyMessageId);
        }}
        className="mb-2 w-full rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-left transition-colors hover:bg-[#f3f4f6]"
      >
        <p className="truncate text-xs font-semibold text-[#374151]">
          {replyTitle}
        </p>
        <p className="mt-1 truncate text-xs text-[#6b7280]">{replyContent}</p>
      </button>
    );
  };

  const messageViewportBottomPadding =
    floatingComposerOnMobile && canInteract
      ? "pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-5"
      : "pb-5";

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <MessageHeader title={chatTitle} showBackButton={showBackButton} />

      <section
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto px-4 py-5 ${messageViewportBottomPadding}`}
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
          <div className="mt-10 flex justify-center">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-sm text-[#6b7280]">
              {t("staff.emptyChat")}
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            const messageId = toTrimmedString(message.id);
            const senderType = toTrimmedString(
              message.sender_type,
            ).toLowerCase();
            const senderId = toTrimmedString(message.sender_id);
            const isOutgoing =
              currentRole === "admin"
                ? senderType === "staff"
                : senderType === "staff" &&
                  senderId.length > 0 &&
                  senderId === currentStaffId;
            const isSending = isOutgoing && isLocalMessage(messageId);
            const textContent = toTrimmedString(message.content);
            const attachmentType = toTrimmedString(
              message.attachment_type,
            ).toLowerCase();
            const attachmentKey = toTrimmedString(message.attachment_key);
            const attachmentUrl = resolvePublicImageUrl(attachmentKey);
            const attachmentFileName =
              attachmentKey.split("/").filter(Boolean).pop() || attachmentKey;
            const messageTime = resolveMessageTime(message.created_at);
            const timelineTime =
              resolveTimelineTime(message.created_at) ||
              resolveTimelineTime(dayjs().toISOString());
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
            const canReact =
              canInteract && !isSending && !isLocalMessage(messageId);
            const shouldReserveActionSlot = true;
            const shouldShowMessageActions =
              canReact &&
              (activeActionMessageId === messageId ||
                activeReactionMessageId === messageId);
            const shouldShowMetadataHint =
              shouldShowMessageActions && activeMetadataMessageId === messageId;

            const shouldShowSenderName =
              senderType === "staff" &&
              (!isOutgoing || currentRole === "admin");
            const messageSenderName = shouldShowSenderName
              ? toTrimmedString(message.sender_name) || t("staffTitle")
              : "";

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
                  className={`mt-3 flex items-end ${isOutgoing ? "justify-end" : "justify-start"}`}
                  onMouseEnter={
                    canReact
                      ? () => {
                          setActiveActionMessageId(messageId);
                          setActiveReactionMessageId((current) => {
                            if (!current || current === messageId)
                              return current;
                            setReactionPickerPosition(null);
                            return "";
                          });
                          queueMetadataHint(messageId);
                        }
                      : undefined
                  }
                  onMouseLeave={
                    canReact
                      ? () => {
                          clearMetadataHintTimeout();
                          setActiveMetadataMessageId((current) =>
                            current === messageId ? "" : current,
                          );
                          setActiveActionMessageId((current) =>
                            current === messageId ? "" : current,
                          );
                        }
                      : undefined
                  }
                  onClick={() => {
                    if (!canReact) {
                      clearMetadataHintTimeout();
                      setActiveMetadataMessageId("");
                      setActiveActionMessageId("");
                      setActiveReactionMessageId("");
                      setReactionPickerPosition(null);
                      return;
                    }

                    setActiveActionMessageId(messageId);
                    queueMetadataHint(messageId);
                    setActiveReactionMessageId((current) => {
                      if (!current || current === messageId) return current;
                      setReactionPickerPosition(null);
                      return "";
                    });
                  }}
                >
                  {isSending ? (
                    <div className="mb-3 mr-2 mt-auto inline-flex h-3 w-3 animate-spin rounded-full border border-[#9ca3af] border-t-transparent" />
                  ) : null}

                  <div
                    className={`flex max-w-full items-end gap-2 ${
                      isOutgoing ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex min-w-0 max-w-[82%] flex-col ${
                        isOutgoing ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="relative w-full">
                        <div
                          className={`w-full select-text rounded-2xl px-3 py-2 shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${
                            isOutgoing
                              ? "rounded-br-md border border-[#fde68a] bg-[#fff7cc]"
                              : "rounded-bl-md border border-[#e5e7eb] bg-[#f3f4f6]"
                          } ${isHighlighted ? "ring-2 ring-[#f59e0b]/60" : ""}`}
                        >
                          {shouldShowSenderName ? (
                            <p className="mb-1 text-xs font-semibold text-[#6b7280]">
                              {messageSenderName}
                            </p>
                          ) : null}

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

                        {shouldShowMetadataHint ? (
                          <div
                            className={`pointer-events-none absolute top-1/2 z-40 inline-flex -translate-y-1/2 whitespace-nowrap items-center gap-1 rounded-md border border-[#e5e7eb] bg-white px-2 py-1 text-[11px] text-[#6b7280] shadow-[0_2px_8px_rgba(15,23,42,0.14)] transition-none ${
                              isOutgoing ? "right-full mr-2" : "left-full ml-2"
                            }`}
                          >
                            <span>{messageTime || "--:--"}</span>
                            {renderDeliveryStatus(message, isOutgoing)}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {shouldReserveActionSlot ? (
                      <div
                        className={`relative mb-1 flex h-7 w-7 shrink-0 self-end transition-opacity ${
                          canReact
                            ? shouldShowMessageActions
                              ? "opacity-100"
                              : "pointer-events-none opacity-0"
                            : "pointer-events-none opacity-0"
                        }`}
                        onMouseEnter={
                          canReact
                            ? () => {
                                clearMetadataHintTimeout();
                                setActiveMetadataMessageId((current) =>
                                  current === messageId ? "" : current,
                                );
                              }
                            : undefined
                        }
                        onMouseLeave={
                          canReact
                            ? () => {
                                queueMetadataHint(messageId);
                              }
                            : undefined
                        }
                      >
                        {canReact ? (
                          <div
                            className={`absolute top-0 flex items-center gap-1 ${
                              isOutgoing ? "right-0" : "left-0"
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
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
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

      {canInteract ? (
        <MessageComposer
          value={draftMessage}
          onChange={setDraftMessage}
          placeholder={t("composerPlaceholder")}
          onSend={handleSendMessage}
          replyTarget={replyTarget}
          onCancelReply={() => setReplyTarget(null)}
          floatingOnMobile={floatingComposerOnMobile}
          onComposerFocus={notifyTyping}
          onUserTyping={notifyTyping}
        />
      ) : (
        <div className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-center text-xs font-medium text-[#6b7280]">
          {t("staff.readonlyHint")}
        </div>
      )}
    </div>
  );
}

export default function ChatDetail(props: ChatDetailProps) {
  return <ChatDetailScreen key={props.chatId || "staff-chat"} {...props} />;
}
