"use client";

import { useMessage } from "@/providers/MessageProvider";
import { Image as AntImage } from "antd";
import { useTranslations } from "next-intl";
import type { ChangeEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCamera,
  FiFileText,
  FiImage,
  FiPaperclip,
  FiSend,
  FiSmile,
  FiX,
} from "react-icons/fi";

const MAX_ATTACHMENT_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_ATTACHMENT_SIZE_MB = 100;

const SIMPLE_EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "😎",
  "🤔",
  "😢",
  "😭",
  "😡",
  "👍",
  "🙏",
  "👏",
  "💪",
  "🔥",
  "❤️",
  "🎉",
] as const;

type SelectedAttachment = {
  file: File;
  isImage: boolean;
  previewUrl?: string;
};

export interface MessageComposerSubmitPayload {
  text: string;
  attachment?: File;
}

export interface MessageComposerReplyTarget {
  messageId: string;
  title: string;
  senderName: string;
  content: string;
}

interface MessageComposerProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSend?: (payload: MessageComposerSubmitPayload) => Promise<void> | void;
  replyTarget?: MessageComposerReplyTarget | null;
  onCancelReply?: () => void;
  floatingOnMobile?: boolean;
  onComposerFocus?: () => void;
  onUserTyping?: () => void;
}

export default function MessageComposer({
  value,
  placeholder,
  onChange,
  onSend,
  replyTarget,
  onCancelReply,
  floatingOnMobile = false,
  onComposerFocus,
  onUserTyping,
}: MessageComposerProps) {
  const t = useTranslations("MessagesPage.composer");
  const messageApi = useMessage();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedAttachment, setSelectedAttachment] =
    useState<SelectedAttachment | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!floatingOnMobile) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateInset = () => {
      const currentViewport = window.visualViewport;
      if (!currentViewport) return;

      const inset = Math.max(
        0,
        window.innerHeight - currentViewport.height - currentViewport.offsetTop,
      );

      setKeyboardInset(inset);
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    window.addEventListener("orientationchange", updateInset);

    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
      window.removeEventListener("orientationchange", updateInset);
    };
  }, [floatingOnMobile]);

  const bottomOffset = useMemo(() => {
    if (!floatingOnMobile) return "0px";
    if (keyboardInset > 0) {
      return `${keyboardInset + 8}px`;
    }

    return "calc(8px + env(safe-area-inset-bottom))";
  }, [floatingOnMobile, keyboardInset]);

  const canSend = useMemo(() => {
    return value.trim().length > 0 || Boolean(selectedAttachment);
  }, [selectedAttachment, value]);

  const clearAttachment = useCallback(() => {
    setSelectedAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const formatFileSize = useCallback((sizeInBytes: number) => {
    if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) return "0 B";
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024)
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const handleSelectAttachment = useCallback(
    (file?: File | null) => {
      if (!file) return;

      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        messageApi.error(
          t("fileTooLarge", { sizeMb: String(MAX_ATTACHMENT_SIZE_MB) }),
        );
        return;
      }

      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

      setSelectedAttachment((prev) => {
        if (prev?.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return { file, isImage, previewUrl };
      });
      setIsAttachmentMenuOpen(false);
    },
    [messageApi, t],
  );

  const handleSelectFileFromInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      handleSelectAttachment(file);
      event.currentTarget.value = "";
    },
    [handleSelectAttachment],
  );

  const triggerInput = useCallback(
    (target: RefObject<HTMLInputElement | null>) => {
      target.current?.click();
    },
    [],
  );

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const input = textInputRef.current;
      if (!input) {
        onChange(`${value}${emoji}`);
        return;
      }

      const start = input.selectionStart ?? value.length;
      const end = input.selectionEnd ?? value.length;
      const nextValue = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
      onChange(nextValue);

      const nextCursor = start + emoji.length;
      window.requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [onChange, value],
  );

  const handleSend = useCallback(async () => {
    if (isSending) return;

    const trimmedValue = value.trim();
    if (!trimmedValue && !selectedAttachment) return;

    setIsSending(true);
    try {
      await onSend?.({
        text: trimmedValue,
        attachment: selectedAttachment?.file,
      });
      onChange("");
      clearAttachment();
      setIsAttachmentMenuOpen(false);
      setIsEmojiPickerOpen(false);
    } catch (error) {
      messageApi.errorFromApi(error, t("sendFailed"));
    } finally {
      setIsSending(false);
      window.requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    }
  }, [
    clearAttachment,
    isSending,
    messageApi,
    onChange,
    onSend,
    selectedAttachment,
    t,
    value,
  ]);

  useEffect(() => {
    return () => {
      if (selectedAttachment?.previewUrl) {
        URL.revokeObjectURL(selectedAttachment.previewUrl);
      }
    };
  }, [selectedAttachment?.previewUrl]);

  return (
    <div
      className={
        floatingOnMobile ? "fixed inset-x-0 bottom-0 z-30 lg:static" : ""
      }
      style={
        floatingOnMobile
          ? {
              bottom: bottomOffset,
              paddingLeft: "max(env(safe-area-inset-left), 0px)",
              paddingRight: "max(env(safe-area-inset-right), 0px)",
            }
          : undefined
      }
      role="presentation"
    >
      <div
        className={`mx-auto w-full ${
          floatingOnMobile
            ? "max-w-none px-4 pb-2"
            : "border-t border-[#e5e7eb] px-4 py-3"
        }`}
      >
        {isAttachmentMenuOpen && (
          <div className="mb-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_2px_12px_rgba(15,23,42,0.1)]">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[#4b5563] transition-colors active:bg-[#f3f4f6]"
                onClick={() => triggerInput(imageInputRef)}
              >
                <FiImage className="h-5 w-5" />
                <span className="text-xs">{t("chooseImage")}</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[#4b5563] transition-colors active:bg-[#f3f4f6]"
                onClick={() => triggerInput(fileInputRef)}
              >
                <FiFileText className="h-5 w-5" />
                <span className="text-xs">{t("chooseFile")}</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[#4b5563] transition-colors active:bg-[#f3f4f6]"
                onClick={() => triggerInput(cameraInputRef)}
              >
                <FiCamera className="h-5 w-5" />
                <span className="text-xs">{t("takePhoto")}</span>
              </button>
            </div>
          </div>
        )}

        {isEmojiPickerOpen && (
          <div className="mb-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_2px_12px_rgba(15,23,42,0.1)]">
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {SIMPLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors active:bg-[#f3f4f6]"
                  onClick={() => handleInsertEmoji(emoji)}
                  aria-label={t("emojiAriaLabel", { emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedAttachment && (
          <div className="mb-2 rounded-2xl border border-[#e5e7eb] bg-white p-2 shadow-[0_2px_12px_rgba(15,23,42,0.1)]">
            <div className="flex items-start gap-2">
              {selectedAttachment.isImage && selectedAttachment.previewUrl ? (
                <AntImage
                  src={selectedAttachment.previewUrl}
                  alt={selectedAttachment.file.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 overflow-hidden rounded-xl"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#6b7280]">
                  <FiFileText className="h-6 w-6" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#111827]">
                  {selectedAttachment.file.name}
                </p>
                <p className="text-xs text-[#6b7280]">
                  {formatFileSize(selectedAttachment.file.size)}
                </p>
              </div>

              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors active:bg-[#f3f4f6]"
                onClick={clearAttachment}
                aria-label={t("removeAttachment")}
                disabled={isSending}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {replyTarget ? (
          <div className="mb-2 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-2 shadow-[0_2px_12px_rgba(15,23,42,0.1)]">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#374151]">
                  {replyTarget.title ||
                    t("replyingTo", { name: replyTarget.senderName })}
                </p>
                <p className="mt-1 truncate text-xs text-[#6b7280]">
                  {replyTarget.content}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors active:bg-[#f3f4f6]"
                onClick={onCancelReply}
                aria-label={t("cancelReply")}
                disabled={isSending}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectFileFromInput}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleSelectFileFromInput}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleSelectFileFromInput}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-3">
          <div className="flex min-h-12 min-w-0 items-center gap-1 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={() => {
                setIsAttachmentMenuOpen((prev) => !prev);
                setIsEmojiPickerOpen(false);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors active:bg-[#f3f4f6]"
              aria-label={t("attach")}
              disabled={isSending}
            >
              <FiPaperclip className="h-5 w-5" />
            </button>

            <input
              ref={textInputRef}
              value={value}
              onChange={(event) => {
                onChange(event.target.value);
                onUserTyping?.();
              }}
              onFocus={() => {
                onComposerFocus?.();
                onUserTyping?.();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 border-none bg-transparent text-base text-[#111827] outline-none placeholder:text-[#9ca3af]"
              disabled={isSending}
            />

            <button
              type="button"
              onClick={() => {
                setIsEmojiPickerOpen((prev) => !prev);
                setIsAttachmentMenuOpen(false);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9ca3af] transition-colors active:bg-[#f3f4f6]"
              aria-label={t("emoji")}
              disabled={isSending}
            >
              <FiSmile className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleSend()}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#9ca3af] shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-colors active:bg-[#f3f4f6] disabled:opacity-40"
            aria-label={t("send")}
            disabled={!canSend || isSending}
          >
            <FiSend className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
