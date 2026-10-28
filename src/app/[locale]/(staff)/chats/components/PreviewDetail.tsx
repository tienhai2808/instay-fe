"use client";

import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import {
  sendWebSocketMessageWithRetry,
  subscribeWebSocket,
} from "@/services/websocket";
import { useAuthStore } from "@/stores/useAuthStore";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";
import { uploadFilesWithPresignedURLs } from "@/utils/presigned-upload";
import { Image as AntImage } from "antd";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiFileText } from "react-icons/fi";
import MessageComposer, { MessageComposerSubmitPayload } from "./Composer";
import MessageHeader from "./Header";
import {
  resolveAttachmentType,
  resolveBookingRoomDisplayName,
  toRecord,
  toTrimmedString,
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

interface WaitNewMessageResponseOptions {
  expectedSenderId: string;
  expectedContent?: string;
  expectedAttachmentKey?: string;
}

interface PreviewDetailProps {
  bookingRoomId: string;
  bookingRoom?: SimpleBookingRoomResponse | null;
  initialChatId?: string;
  floatingComposerOnMobile?: boolean;
  showBackButton?: boolean;
}

const NEW_MESSAGE_RESPONSE_TIMEOUT_MS = 12_000;

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

export default function PreviewDetail({
  bookingRoomId,
  bookingRoom,
  initialChatId = "",
  floatingComposerOnMobile = false,
  showBackButton = false,
}: PreviewDetailProps) {
  const t = useTranslations("MessagesPage");
  const router = useRouter();
  const messageApi = useMessage();
  const user = useAuthStore((state) => state.user);

  const [draftMessage, setDraftMessage] = useState("");
  const [previewMessages, setPreviewMessages] = useState<PreviewMessageItem[]>(
    [],
  );
  const attachmentPreviewUrlsRef = useRef<string[]>([]);

  const senderId = toTrimmedString(user?.id);
  const currentRole = toTrimmedString(user?.role).toLowerCase();
  const senderName =
    toTrimmedString(user?.username) ||
    [toTrimmedString(user?.first_name), toTrimmedString(user?.last_name)]
      .filter(Boolean)
      .join(" ") ||
    toTrimmedString(user?.email) ||
    "staff";
  const departmentId = toTrimmedString(user?.department?.id);
  const canInteract =
    currentRole !== "admin" && senderId.length > 0 && departmentId.length > 0;

  const chatTitle = resolveBookingRoomDisplayName(
    bookingRoom,
    t("detail.defaultHeader"),
  );
  const timestampText = dayjs().format("DD/MM/YYYY • HH:mm");

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
            const resolvedChatId = responseChatId || initialChatId;
            if (!resolvedChatId) {
              finish(new Error("missing_chat_id_from_ws_response"));
              return;
            }

            finish(undefined, { resolvedChatId });
          },
        });
      });
    },
    [initialChatId],
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

      if (!canInteract || !bookingRoomId || !senderId || !departmentId) {
        throw new Error("missing_preview_context");
      }

      const optimisticMessages: PreviewMessageItem[] = [];

      if (trimmedText) {
        optimisticMessages.push({
          id: createLocalMessageId(),
          type: "text",
          content: trimmedText,
        });
      }

      let attachmentPreviewUrl: string | undefined;
      let attachmentType: PreviewAttachmentType | undefined;

      if (attachment) {
        attachmentType = resolveAttachmentType(attachment);
        attachmentPreviewUrl =
          attachmentType === "image" ? URL.createObjectURL(attachment) : "";
        if (attachmentPreviewUrl) {
          attachmentPreviewUrlsRef.current.push(attachmentPreviewUrl);
        }

        optimisticMessages.push({
          id: createLocalMessageId(),
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
          attachmentKey = toTrimmedString(uploadResults[0]?.key);
          if (!attachmentKey) {
            throw new Error("missing_attachment_key");
          }
        }

        if (trimmedText && attachment && attachmentType && attachmentKey) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              content: trimmedText,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "staff",
              sender_name: senderName,
              chat_id: initialChatId || undefined,
              department_id: departmentId,
            },
            {
              expectedSenderId: senderId,
              expectedContent: trimmedText,
            },
          );

          await sendNewMessageEvent({
            attachment_type: attachmentType,
            attachment_key: attachmentKey,
            booking_room_id: bookingRoomId,
            sender_id: senderId,
            sender_type: "staff",
            sender_name: senderName,
            chat_id: resolvedChatId,
            department_id: departmentId,
          });

          router.push(`/chats/${resolvedChatId}`);
          return;
        }

        if (trimmedText) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              content: trimmedText,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "staff",
              sender_name: senderName,
              chat_id: initialChatId || undefined,
              department_id: departmentId,
            },
            {
              expectedSenderId: senderId,
              expectedContent: trimmedText,
            },
          );

          router.push(`/chats/${resolvedChatId}`);
          return;
        }

        if (attachment && attachmentType && attachmentKey) {
          const resolvedChatId = await sendNewMessageAndWaitForChatId(
            {
              attachment_type: attachmentType,
              attachment_key: attachmentKey,
              booking_room_id: bookingRoomId,
              sender_id: senderId,
              sender_type: "staff",
              sender_name: senderName,
              chat_id: initialChatId || undefined,
              department_id: departmentId,
            },
            {
              expectedSenderId: senderId,
              expectedAttachmentKey: attachmentKey,
            },
          );
          router.push(`/chats/${resolvedChatId}`);
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

        messageApi.errorFromApi(error, t("composer.sendFailed"));
      }
    },
    [
      bookingRoomId,
      canInteract,
      departmentId,
      initialChatId,
      messageApi,
      router,
      sendNewMessageAndWaitForChatId,
      senderId,
      senderName,
      t,
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

  const messageViewportBottomPadding =
    floatingComposerOnMobile && canInteract
      ? "pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-5"
      : "pb-5";

  const hasMissingContext = !bookingRoomId || !bookingRoom;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <MessageHeader title={chatTitle} showBackButton={showBackButton} />

      <section
        className={`flex-1 overflow-y-auto px-4 py-5 ${messageViewportBottomPadding}`}
      >
        <p className="text-center text-xs font-semibold text-[#9ca3af]">
          {timestampText}
        </p>

        {hasMissingContext ? (
          <div className="mt-10 flex justify-center">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-sm text-[#6b7280]">
              {t("staff.previewMissingBookingRoom")}
            </div>
          </div>
        ) : previewMessages.length === 0 ? (
          <div className="mt-10 flex justify-center">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-2 text-sm text-[#6b7280]">
              {t("staff.emptyChat")}
            </div>
          </div>
        ) : (
          previewMessages.map((message) => (
            <div key={message.id} className="mt-3 flex justify-end">
              {message.type === "text" ? (
                <div className="max-w-[80%] rounded-2xl rounded-br-md border border-[#fde68a] bg-[#fff7cc] px-4 py-2 text-sm text-[#111827]">
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
          ))
        )}
      </section>

      {canInteract ? (
        <MessageComposer
          value={draftMessage}
          onChange={setDraftMessage}
          placeholder={t("composerPlaceholder")}
          onSend={handleSendMessage}
          floatingOnMobile={floatingComposerOnMobile}
        />
      ) : (
        <div className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-center text-xs font-medium text-[#6b7280]">
          {t("staff.readonlyHint")}
        </div>
      )}
    </div>
  );
}
