"use client";

import { getGuestNotifications } from "@/apis/notification";
import { LOCALE_EN } from "@/constants/locale";
import type { NotificationResponse } from "@/types/response/notification";
import { useInfiniteQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, type UIEvent } from "react";
import { FiChevronRight, FiX } from "react-icons/fi";

interface GuestNotificationPanelProps {
  open: boolean;
  locale: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const PAGE_LIMIT = 12;
const ORDER_SERVICE_CONTENT_TYPE = "order_service";
const SUPPORT_TICKET_CONTENT_TYPE = "support_ticket";
const EVENT_CONTENT_TYPE = "event";

const normalizeContentType = (value?: string) =>
  value?.trim().toLowerCase() ?? "";

const resolveGuestNotificationPath = (
  contentType: string,
  contentKey?: string,
) => {
  if (contentType === ORDER_SERVICE_CONTENT_TYPE) {
    return "/orders";
  }

  if (contentType === SUPPORT_TICKET_CONTENT_TYPE) {
    return "/requests";
  }

  if (contentType === EVENT_CONTENT_TYPE) {
    const normalizedContentKey = contentKey?.trim() || "";
    return normalizedContentKey ? `/news/${normalizedContentKey}` : "/news";
  }

  return "";
};

const resolveNotificationContent = (
  item: NotificationResponse,
  isEnglish: boolean,
) => {
  if (isEnglish) {
    return item.content_en || item.content_vi || "";
  }

  return item.content_vi || item.content_en || "";
};

const formatNotificationTime = (value: string) => {
  const parsed = dayjs(value);
  if (!parsed.isValid()) return "-";
  return parsed.format("DD/MM/YYYY HH:mm");
};

export default function NotificationPanel({
  open,
  locale,
  onClose,
  onNavigate,
}: GuestNotificationPanelProps) {
  const tHeader = useTranslations("HomePage.header");
  const isEnglish = locale === LOCALE_EN;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["guest", "notifications", "list", PAGE_LIMIT],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        return await getGuestNotifications({
          page: Number(pageParam),
          limit: PAGE_LIMIT,
        });
      },
      getNextPageParam: (lastPage) => {
        const meta = lastPage.data.data.meta;
        if (!meta.has_next || typeof meta.page !== "number") return undefined;
        return meta.page + 1;
      },
      enabled: open,
      staleTime: 0,
    });

  const notifications = useMemo(() => {
    return (
      data?.pages.flatMap((page) => page.data.data.notifications || []) || []
    );
  }, [data?.pages]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage) return;

    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining > 120) return;

    void fetchNextPage();
  };

  const openNotificationDetail = (item: NotificationResponse) => {
    const path = resolveGuestNotificationPath(
      normalizeContentType(item.content_type),
      item.content_key,
    );

    if (!path) return;

    onNavigate(path);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#f8f5ff]">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between bg-[#8b5cf6] px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] text-white shadow-sm">
          <p className="text-base font-semibold">
            {tHeader("notificationPanel.title")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            aria-label={tHeader("notificationPanel.close")}
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+20px)]"
          onScroll={handleListScroll}
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[90px] animate-pulse rounded-2xl bg-white shadow-[0_4px_14px_rgba(124,58,237,0.1)]"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-[#e9d5ff] bg-white px-4 py-5 text-center text-sm font-medium text-[#7c3aed]">
              {tHeader("notificationPanel.empty")}
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((item) => {
                const content = resolveNotificationContent(item, isEnglish);
                const createdAt = formatNotificationTime(item.created_at);
                const isUnread = !item.is_read;
                const detailPath = resolveGuestNotificationPath(
                  normalizeContentType(item.content_type),
                  item.content_key,
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!detailPath}
                    onClick={() => openNotificationDetail(item)}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      detailPath
                        ? "cursor-pointer active:scale-[0.995]"
                        : "cursor-default",
                      isUnread
                        ? "border-[#d8b4fe] bg-[#f5ecff]"
                        : "border-[#e5e7eb] bg-white",
                    ].join(" ")}
                  >
                    <p className="text-sm font-semibold text-[#2f2b27]">
                      {content || "-"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-xs text-[#6b7280]">
                        {createdAt}
                      </span>
                      <div className="flex items-center gap-2">
                        {isUnread ? (
                          <span className="rounded-full bg-[#8b5cf6] px-2 py-0.5 text-[10px] font-semibold text-white">
                            {tHeader("notificationPanel.unread")}
                          </span>
                        ) : null}
                        {detailPath ? (
                          <FiChevronRight className="h-4 w-4 text-[#8b5cf6]" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}

              {isFetchingNextPage ? (
                <p className="py-2 text-center text-xs font-medium text-[#7c3aed]">
                  {tHeader("notificationPanel.loading")}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
