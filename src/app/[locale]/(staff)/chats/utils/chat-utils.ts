import dayjs from "dayjs";
import type {
  BasicAdminChatResponse,
  ChatAttachmentType,
} from "@/types/response/chat";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";

export const CHAT_LIST_PAGE_LIMIT = 12;
export const CHAT_SEARCH_DEBOUNCE_MS = 350;
export const CHAT_MESSAGES_PAGE_LIMIT = 20;

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

export const toNullableTrimmedString = (value: unknown) => {
  const nextValue = toTrimmedString(value);
  return nextValue || null;
};

export const resolveUnreadCountFromChat = (chat: BasicAdminChatResponse) => {
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

export const resolveBookingRoomDisplayName = (
  bookingRoom?: SimpleBookingRoomResponse | null,
  fallback = "Cuộc trò chuyện",
) => {
  const bookingNumber = toTrimmedString(bookingRoom?.booking?.booking_number);
  const roomName = toTrimmedString(bookingRoom?.room?.name);

  if (bookingNumber && roomName) return `${roomName} ${bookingNumber}`;
  if (bookingNumber) return bookingNumber;
  if (roomName) return roomName;

  const code = toTrimmedString(bookingRoom?.code);
  if (code) return code;

  const bookingRoomId = toTrimmedString(bookingRoom?.id);
  if (bookingRoomId) return `#${bookingRoomId}`;

  return fallback;
};

export const resolveChatInitials = (chatName?: string | null) => {
  const words = (chatName || "").trim().split(/\s+/).filter(Boolean);

  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || "CH";
};

export const resolveChatListTime = (
  value: string | null | undefined,
  nowLabel: string,
  now = dayjs(),
) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "-";

  const diffMinutes = now.diff(parsed, "minute");
  if (diffMinutes < 1) return nowLabel;
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = now.diff(parsed, "hour");
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = now.diff(parsed, "day");
  if (diffDays < 7) return `${diffDays}d`;

  return parsed.format("DD/MM");
};

export const resolveAttachmentPreviewLabel = (
  attachmentType: ChatAttachmentType | null | undefined,
  imageLabel: string,
  fileLabel: string,
) => {
  const normalized = toTrimmedString(attachmentType).toLowerCase();
  if (normalized === "image") return imageLabel;
  if (normalized === "file") return fileLabel;
  return "";
};

export const resolveMessageTime = (value: string | undefined) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return parsed.isSame(dayjs(), "day")
    ? parsed.format("HH:mm")
    : parsed.format("DD/MM/YYYY • HH:mm");
};

export const resolveTimelineTime = (value: string | undefined) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "";
  return parsed.isSame(dayjs(), "day")
    ? parsed.format("HH:mm")
    : parsed.format("DD/MM/YYYY • HH:mm");
};

export const createLocalMessageId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `local-${crypto.randomUUID()}`;
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const isLocalMessage = (messageId: string) =>
  messageId.startsWith("local-");

export const buildMessageSignature = (
  content: string | null | undefined,
  attachmentKey: string | null | undefined,
) => {
  return `${toTrimmedString(content)}|${toTrimmedString(attachmentKey)}`;
};

export const resolveAttachmentType = (file: File): "image" | "file" => {
  return file.type.startsWith("image/") ? "image" : "file";
};
