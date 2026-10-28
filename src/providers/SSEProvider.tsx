"use client";

import { useCallback, useEffect, useRef } from "react";
import { getMe } from "@/apis/auth";
import {
  SSE_EVENT_ORDER_SERVICE,
  SSE_RECEIVER_TYPE_STAFF,
} from "@/constants/sse";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { stopSseConnection, subscribeSse } from "@/services/sse";
import type { SseEventPayload } from "@/types/data/sse";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { queryKeys } from "@/constants/query-keys";

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if (!("response" in error)) return undefined;

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return undefined;

  const status = (response as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const normalizeRole = (role?: string) => role?.trim().toLowerCase() ?? "";

interface OrderServiceSseData {
  content_en?: string;
  content_vi?: string;
  content_key?: string;
  content_id?: string;
  content_type?: string;
  receiver_type?: string;
}

const toOrderServiceSseData = (value: unknown): OrderServiceSseData | null => {
  if (!value || typeof value !== "object") return null;
  return value as OrderServiceSseData;
};

const resolveOrderMessageByLocale = (
  locale: string,
  payload: OrderServiceSseData,
) => {
  const enMessage = payload.content_en?.trim();
  const viMessage = payload.content_vi?.trim();

  if (locale === "en") {
    return enMessage || viMessage || "";
  }

  return viMessage || enMessage || "";
};

const toContentKey = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "";
};

export default function SSEProvider() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  const bootstrappedRef = useRef(false);
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const messageApi = useMessage();

  const handleSseEvent = useCallback(
    (eventPayload: SseEventPayload) => {
      if (eventPayload.event !== SSE_EVENT_ORDER_SERVICE) return;

      const payload = toOrderServiceSseData(eventPayload.data);
      if (!payload) return;

      const receiverType = normalizeRole(payload.receiver_type);
      if (receiverType !== SSE_RECEIVER_TYPE_STAFF) return;

      const messageContent = resolveOrderMessageByLocale(locale, payload);
      if (!messageContent) return;

      const contentType = normalizeRole(payload.content_type);
      const contentKey = toContentKey(
        payload.content_key ?? payload.content_id,
      );
      const canNavigate =
        contentType === SSE_EVENT_ORDER_SERVICE && Boolean(contentKey);

      messageApi.customToast({
        type: "info",
        content: messageContent,
        actionLabel: canNavigate ? t("viewNow") : undefined,
        onAction: canNavigate
          ? () => {
              router.push(`/order-services/${contentKey}`);
            }
          : undefined,
        autoCloseMs: canNavigate ? null : undefined,
      });
    },
    [locale, messageApi, router, t],
  );

  useEffect(() => {
    if (isAuthenticated === false) {
      stopSseConnection();
      return;
    }

    const normalizedRole = normalizeRole(user?.role);

    if (isAuthenticated === true && normalizedRole) {
      if (normalizedRole !== "staff") {
        stopSseConnection();
        return;
      }

      return subscribeSse({
        onEvent: handleSseEvent,
      });
    }

    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        const res = await queryClient.fetchQuery({
          queryKey: queryKeys.auth.me(),
          queryFn: async () => getMe(),
          staleTime: 300,
        });
        if (cancelled) return;

        const user = res.data?.data?.user ?? null;
        setUser(user);
        setAuthenticated(Boolean(user));
      } catch (error) {
        if (cancelled) return;

        const status = getErrorStatus(error);
        if (status === 401 || status === 403) {
          setAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          bootstrappedRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      bootstrappedRef.current = false;
    };
  }, [
    handleSseEvent,
    isAuthenticated,
    queryClient,
    setAuthenticated,
    setUser,
    user,
  ]);

  return null;
}
