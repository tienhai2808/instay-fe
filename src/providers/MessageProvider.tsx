"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { message } from "antd";
import { ToastModal } from "@/components/shared/ui/ToastModal";
import { ToastItem, ToastType } from "@/types/data/toast";
import {
  getApiCode,
  resolveApiErrorMessage,
  resolveApiMessage,
} from "@/utils/api-response";
import { AUTH_SILENT_ERROR_FLAG } from "@/constants/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { usePathname } from "next/navigation";
import { ERROR_CODES } from "@/constants/error-codes";

interface MessageContextProps {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  loading: (msg: string) => void;
  customToast: (payload: {
    type?: ToastType;
    content: string;
    actionLabel?: string;
    onAction?: () => void;
    autoCloseMs?: number | null;
  }) => void;
  fromApi: (payload: unknown, fallbackType?: ToastType) => void;
  errorFromApi: (payload: unknown, fallbackMessage?: string) => void;
}

const MessageContext = createContext<MessageContextProps | null>(null);

const isSilentAuthError = (payload: unknown) => {
  return Boolean(
    payload && typeof payload === "object" && AUTH_SILENT_ERROR_FLAG in payload,
  );
};

export const useMessage = () => {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error(ERROR_CODES.MESSAGE_PROVIDER_CONTEXT_MISSING);
  return ctx;
};

export default function MessageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [antdMessageApi, contextHolder] = message.useMessage();
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();

  const addToast = useCallback(
    ({
      type,
      message,
      actionLabel,
      onAction,
      autoCloseMs,
    }: Omit<ToastItem, "id">) => {
      if (!message) return;

      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [
        ...prev,
        { id, type, message, actionLabel, onAction, autoCloseMs },
      ]);

      if (autoCloseMs === null) return;

      const durationMs =
        typeof autoCloseMs === "number"
          ? autoCloseMs
          : type === "loading" || actionLabel
            ? null
            : 4000;

      if (durationMs === null) return;

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    },
    [],
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showMessage = useCallback(
    (type: ToastType, content: string) => {
      if (!content) return;

      const isAuthRoute =
        pathname?.includes("/login") ||
        pathname?.includes("/forgot-password") ||
        pathname?.includes("/new-password") ||
        pathname?.includes("/register");
      const allowCustomToast = !isAuthRoute && isAuthenticated !== false;
      if (allowCustomToast) {
        addToast({ type, message: content });
        return;
      }

      antdMessageApi.open({
        type,
        content: <span className="antd-message-compact">{content}</span>,
        className: "antd-message-compact-wrap",
        style: { marginTop: 12 },
      });
    },
    [addToast, antdMessageApi, isAuthenticated, pathname],
  );

  const showCustomToast = useCallback(
    (payload: {
      type?: ToastType;
      content: string;
      actionLabel?: string;
      onAction?: () => void;
      autoCloseMs?: number | null;
    }) => {
      if (!payload.content) return;

      const isAuthRoute =
        pathname?.includes("/login") ||
        pathname?.includes("/forgot-password") ||
        pathname?.includes("/new-password") ||
        pathname?.includes("/register");

      const allowCustomToast = !isAuthRoute && isAuthenticated !== false;
      if (allowCustomToast) {
        addToast({
          type: payload.type ?? "info",
          message: payload.content,
          actionLabel: payload.actionLabel,
          onAction: payload.onAction,
          autoCloseMs: payload.autoCloseMs,
        });
        return;
      }

      antdMessageApi.open({
        type: payload.type ?? "info",
        content: (
          <span className="antd-message-compact">{payload.content}</span>
        ),
        className: "antd-message-compact-wrap",
        style: { marginTop: 12 },
      });
    },
    [addToast, antdMessageApi, isAuthenticated, pathname],
  );

  const getTypeFromApi = useCallback(
    (payload: unknown, fallbackType: ToastType): ToastType => {
      const code = getApiCode(payload);
      if (typeof code !== "number") return fallbackType;
      if (code >= 4000 && code < 6000) return "error";
      if (code >= 6000 && code < 7000) return "info";
      return fallbackType;
    },
    [],
  );

  const api: MessageContextProps = useMemo(
    () => ({
      success: (msg) => showMessage("success", msg),
      error: (msg) => showMessage("error", msg),
      info: (msg) => showMessage("info", msg),
      warning: (msg) => showMessage("warning", msg),
      loading: (msg) => showMessage("loading", msg),
      customToast: (payload) => showCustomToast(payload),
      fromApi: (payload, fallbackType = "info") => {
        const content = resolveApiMessage(payload);
        if (!content) return;
        showMessage(getTypeFromApi(payload, fallbackType), content);
      },
      errorFromApi: (payload, fallbackMessage) => {
        if (isSilentAuthError(payload)) return;
        const content = resolveApiErrorMessage(payload, fallbackMessage);
        if (!content) return;
        showMessage("error", content);
      },
    }),
    [getTypeFromApi, showCustomToast, showMessage],
  );

  return (
    <MessageContext.Provider value={api}>
      {contextHolder}
      {children}
      <ToastModal toasts={toasts} onClose={closeToast} />
    </MessageContext.Provider>
  );
}
