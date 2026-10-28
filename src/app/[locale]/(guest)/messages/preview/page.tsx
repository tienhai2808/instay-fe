"use client";

import { getDepartmentByIdentifier } from "@/apis/department";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import {
  sendWebSocketMessageWithRetry,
  subscribeWebSocket,
} from "@/services/websocket";
import { useGuestStore } from "@/stores/useGuestStore";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { useQuery } from "@tanstack/react-query";
import { Image as AntImage } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFileText } from "react-icons/fi";
import MessageComposer, {
  MessageComposerSubmitPayload,
} from "../components/Composer";
import MessageHeader from "../components/Header";
import {
  DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME,
  resolveDepartmentFromResponse,
  resolveDepartmentInitials,
} from "../utils/chat-utils";

type PreviewAttachmentType = "image" | "file";
type PreviewMessageType = "text" | "attachment";

interface PreviewMessageItem {
  id: string;
  type: PreviewMessageType;
  content: string;
  attachmentType?: PreviewAttachmentType;
  attachmentPreviewUrl?: string;
}

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

interface WaitNewMessageResponseOptions {
  expectedSenderId: string;
  expectedContent?: string;
  expectedAttachmentKey?: string;
}

const NEW_MESSAGE_RESPONSE_TIMEOUT_MS = 12_000;

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }
  return "";
};

const resolveAttachmentType = (file: File): PreviewAttachmentType => {
  return file.type.startsWith("image/") ? "image" : "file";
};

const createLocalMessageId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();

  return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

export default function MessagePreviewPage() {
  const t = useTranslations("MessagesPage");
  const router = useRouter();
  const messageApi = useMessage();
  const searchParams = useSearchParams();
  const [draftMessage, setDraftMessage] = useState("");
  const [previewMessages, setPreviewMessages] = useState<PreviewMessageItem[]>(
    [],
  );
  const attachmentPreviewUrlsRef = useRef<string[]>([]);
  const bookingRoom = useGuestStore((state) => state.bookingRoom);
  const departmentId = searchParams.get("department_id")?.trim() || "";
  const chatId = searchParams.get("chat_id")?.trim() || "";

  const { data: departmentRes, error: departmentError } = useQuery({
    queryKey: ["guest", "department", "preview", departmentId],
    queryFn: async () => await getDepartmentByIdentifier(departmentId),
    enabled: departmentId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!departmentError) return;
    messageApi.errorFromApi(departmentError);
  }, [departmentError, messageApi]);

  const department = useMemo(
    () => resolveDepartmentFromResponse(departmentRes?.data?.data),
    [departmentRes?.data?.data],
  );

  const departmentName =
    department?.name?.trim() || DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME;
  const departmentAvatarLabel = resolveDepartmentInitials(departmentName);
  const timestampText = dayjs().format("DD/MM/YYYY • HH:mm");
  const bookingRoomId = bookingRoom?.id?.trim() || "";
  const senderId =
    bookingRoom?.booking?.id?.trim() || bookingRoom?.id?.trim() || "";
  const senderName = (() => {
    const roomName = bookingRoom?.room?.name?.trim() || "";
    const bookingNumber = bookingRoom?.booking?.booking_number?.trim() || "";
    if (roomName && bookingNumber) return `${roomName} ${bookingNumber}`;
    if (roomName) return roomName;
    if (bookingNumber) return bookingNumber;

    if (bookingRoom?.code?.trim()) return bookingRoom.code.trim();
    if (bookingRoom?.id?.trim()) return bookingRoom.id.trim();
    return "guest";
  })();

  const waitForNewMessageResponse = useCallback(
    (
      options: WaitNewMessageResponseOptions,
    ): Promise<{ resolvedChatId: string }> => {
      return new Promise((resolve, reject) => {
        let settled = false;
        let unsubscribe: () => void = () => {};

        const finish = (
          error?: Error,
          payload?: { resolvedChatId: string },
        ) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          unsubscribe();

          if (error) {
            reject(error);
            return;
          }

          resolve(payload || { resolvedChatId: "" });
        };

        const timeoutId = window.setTimeout(() => {
          finish(new Error("ws_response_timeout"));
        }, NEW_MESSAGE_RESPONSE_TIMEOUT_MS);

        unsubscribe = subscribeWebSocket({
          onEvent: (payload) => {
            if (payload.event !== "new_message") return;

            const dataRecord = toRecord(payload.data);
            const messageRecord = toRecord(dataRecord?.message);
            if (!messageRecord) return;

            const responseSenderId = toTrimmedString(messageRecord.sender_id);
            if (
              responseSenderId &&
              responseSenderId !== options.expectedSenderId
            ) {
              return;
            }

            if (typeof options.expectedContent === "string") {
              const responseContent = toTrimmedString(messageRecord.content);
              if (responseContent !== options.expectedContent.trim()) return;
            }

            if (typeof options.expectedAttachmentKey === "string") {
              const responseAttachmentKey = toTrimmedString(
                messageRecord.attachment_key,
              );
              if (responseAttachmentKey !== options.expectedAttachmentKey)
                return;
            }

            const responseChatId = toTrimmedString(messageRecord.chat_id);
            const resolvedChatId = responseChatId || chatId;
            if (!resolvedChatId) {
              finish(new Error("missing_chat_id_from_ws_response"));
              return;
            }

            finish(undefined, { resolvedChatId });
          },
        });
      });
    },
    [chatId],
  );

  const sendNewMessageAndWaitForChatId = useCallback(
    async (
      payload: CreateMessageWebSocketData,
      waitOptions: WaitNewMessageResponseOptions,
    ) => {
      await sendNewMessageEvent(payload);
      const { resolvedChatId } = await waitForNewMessageResponse(waitOptions);
      return resolvedChatId;
    },
    [waitForNewMessageResponse],
  );

  const handleSendMessage = useCallback(
    async ({ text, attachment }: MessageComposerSubmitPayload) => {
      const trimmedText = text.trim();
      if (!trimmedText && !attachment) return;

      if (!departmentId || !bookingRoomId || !senderId) {
        throw new Error("missing_preview_context");
      }

      const optimisticMessages: PreviewMessageItem[] = [];

      let textMessageId = "";
      if (trimmedText) {
        textMessageId = createLocalMessageId();
        optimisticMessages.push({
          id: textMessageId,
          type: "text",
          content: trimmedText,
        });
      }

      let attachmentMessageId = "";
      let attachmentPreviewUrl: string | undefined;
      let attachmentType: PreviewAttachmentType | undefined;

      if (attachment) {
        attachmentMessageId = createLocalMessageId();
        attachmentType = resolveAttachmentType(attachment);
        attachmentPreviewUrl =
          attachmentType === "image" ? URL.createObjectURL(attachment) : "";
        if (attachmentPreviewUrl) {
          attachmentPreviewUrlsRef.current.push(attachmentPreviewUrl);
        }

        optimisticMessages.push({
          id: attachmentMessageId,
          type: "attachment",
          content: attachment.name,
          attachmentType,
          attachmentPreviewUrl: attachmentPreviewUrl || undefined,
        });
      }

      setPreviewMessages((prev) => [...prev, ...optimisticMessages]);

      try {
        let attachmentKey = "";

        if (attachment) {
          const uploadResults = await uploadFilesWithPresignedURLs([
            { file: attachment },
          ]);
          attachmentKey = uploadResults[0]?.key?.trim() || "";
          if (!attachmentKey) {
            throw new Error("missing_attachment_key");
          }
        }

        if (trimmedText && attachment && attachmentType && attachmentKey) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              content: trimmedText,
              department_id: departmentId,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "guest",
              sender_name: senderName,
              chat_id: chatId || undefined,
            },
            {
              expectedSenderId: senderId,
              expectedContent: trimmedText,
            },
          );

          await sendNewMessageEvent({
            attachment_type: attachmentType,
            attachment_key: attachmentKey,
            department_id: departmentId,
            booking_room_id: bookingRoomId,
            sender_id: senderId,
            sender_type: "guest",
            sender_name: senderName,
            chat_id: resolvedChatId,
          });

          router.push(`/messages/${resolvedChatId}`);
          return;
        }

        if (trimmedText) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              content: trimmedText,
              department_id: departmentId,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "guest",
              sender_name: senderName,
              chat_id: chatId || undefined,
            },
            {
              expectedSenderId: senderId,
              expectedContent: trimmedText,
            },
          );

          router.push(`/messages/${resolvedChatId}`);
          return;
        }

        if (attachment && attachmentType && attachmentKey) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              attachment_type: attachmentType,
              attachment_key: attachmentKey,
              department_id: departmentId,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "guest",
              sender_name: senderName,
              chat_id: chatId || undefined,
            },
            {
              expectedSenderId: senderId,
              expectedAttachmentKey: attachmentKey,
            },
          );
          router.push(`/messages/${resolvedChatId}`);
        }
      } catch (error) {
        const rollbackIds = new Set(
          optimisticMessages.map((message) => message.id),
        );
        setPreviewMessages((prev) =>
          prev.filter((message) => !rollbackIds.has(message.id)),
        );

        if (attachmentPreviewUrl) {
          URL.revokeObjectURL(attachmentPreviewUrl);
          attachmentPreviewUrlsRef.current =
            attachmentPreviewUrlsRef.current.filter(
              (url) => url !== attachmentPreviewUrl,
            );
        }

        throw error;
      }
    },
    [
      bookingRoomId,
      chatId,
      departmentId,
      router,
      sendNewMessageAndWaitForChatId,
      senderId,
      senderName,
    ],
  );

  useEffect(() => {
    return () => {
      const previewUrls = attachmentPreviewUrlsRef.current;
      for (const previewUrl of previewUrls) {
        URL.revokeObjectURL(previewUrl);
      }
      attachmentPreviewUrlsRef.current = [];
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-screen-sm flex-col bg-white pb-24">
      <MessageHeader departmentName={departmentName} />

      <section className="flex-1 px-4 py-5 pb-[calc(140px+env(safe-area-inset-bottom))]">
        <p className="text-center text-xs font-semibold text-[#9ca3af]">
          {timestampText}
        </p>

        <div className="mt-8 flex items-end gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde047] text-xs font-bold text-[#111827]">
            {departmentAvatarLabel}
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-[#e5e7eb] px-4 py-2 text-sm text-[#374151]">
            {t("preview.departmentMessage")}
          </div>
        </div>

        {previewMessages.map((message) => (
          <div key={message.id} className="mt-3 flex justify-end">
            {message.type === "text" ? (
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#fde047] px-4 py-2 text-sm text-[#111827]">
                {message.content}
              </div>
            ) : (
              <div className="max-w-[80%] rounded-2xl rounded-br-md border border-[#fde68a] bg-[#fff7cc] px-3 py-2">
                {message.attachmentType === "image" &&
                message.attachmentPreviewUrl ? (
                  <AntImage
                    src={message.attachmentPreviewUrl}
                    alt={message.content}
                    className="max-h-56 w-full cursor-zoom-in overflow-hidden rounded-xl"
                    style={{
                      maxHeight: 224,
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#fde68a] text-[#6b7280]">
                      <FiFileText className="h-5 w-5" />
                    </div>
                    <p className="min-w-0 truncate text-sm text-[#111827]">
                      {message.content}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      <MessageComposer
        value={draftMessage}
        onChange={setDraftMessage}
        placeholder={t("composerPlaceholder")}
        onSend={handleSendMessage}
      />
    </div>
  );
}
