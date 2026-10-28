"use client";

import { getNotifications } from "@/apis/notification";
import { LOCALE_EN } from "@/constants/locale";
import type { NotificationResponse } from "@/types/response/notification";
import { Empty, Spin } from "antd";
import dayjs from "dayjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FiX } from "react-icons/fi";
import { useMemo, type UIEvent } from "react";

interface NotificationPanelProps {
  open: boolean;
  isMobile: boolean;
  locale: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

const PAGE_LIMIT = 12;
const ORDER_SERVICE_CONTENT_TYPE = "order_service";
const BOOKING_CONTENT_TYPE = "booking";
const SUPPORT_TICKET_CONTENT_TYPE = "support_ticket";

const normalizeContentType = (value?: string) =>
  value?.trim().toLowerCase() ?? "";

const resolveDetailPath = (contentType: string, contentKey: string) => {
  if (contentType === ORDER_SERVICE_CONTENT_TYPE) {
    if (!contentKey) return "";
    return `/order-services/${contentKey}`;
  }

  if (contentType === BOOKING_CONTENT_TYPE) {
    if (!contentKey) return "";
    return `/bookings/${contentKey}`;
  }

  if (contentType === SUPPORT_TICKET_CONTENT_TYPE) {
    return "/support-tickets";
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

export function NotificationPanel({
  open,
  isMobile,
  locale,
  onClose,
  onNavigate,
}: NotificationPanelProps) {
  const isEnglish = locale === LOCALE_EN;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["notifications", "list", PAGE_LIMIT],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        return await getNotifications({
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

  const handleListScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage) return;

    const target = event.currentTarget;
    const remaining =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining > 120) return;

    void fetchNextPage();
  };

  const openNotificationDetail = (item: NotificationResponse) => {
    const path = resolveDetailPath(
      normalizeContentType(item.content_type),
      item.content_key,
    );

    if (!path) return;

    onNavigate(path);
    onClose();
  };

  if (!open) return null;

  const title = isEnglish ? "Notifications" : "Thông báo";
  const emptyText = isEnglish ? "No notifications" : "Chưa có thông báo";
  const closeLabel = isEnglish ? "Close" : "Đóng";

  const listContent = (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      onScroll={handleListScroll}
    >
      {isLoading ? (
        <div className="flex h-full min-h-[240px] items-center justify-center">
          <Spin />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex h-full min-h-[240px] items-center justify-center">
          <Empty description={emptyText} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((item) => {
            const content = resolveNotificationContent(item, isEnglish);
            const createdAt = formatNotificationTime(item.created_at);
            const isUnread = !item.is_read;
            const detailPath = resolveDetailPath(
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
                  "w-full rounded-lg border px-3 py-3 text-left transition",
                  detailPath
                    ? "cursor-pointer hover:border-gray-300 hover:bg-gray-50"
                    : "cursor-default",
                  isUnread
                    ? "border-[#BFDBFE] bg-[#EFF6FF]"
                    : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <p className="mb-2 text-sm font-medium text-[#111827]">
                  {content}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">{createdAt}</span>
                  {isUnread ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"
                      aria-label={
                        isEnglish ? "Unread notification" : "Thông báo chưa đọc"
                      }
                    />
                  ) : null}
                </div>
              </button>
            );
          })}

          {isFetchingNextPage ? (
            <div className="py-2 text-center">
              <Spin size="small" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-white">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-base font-semibold text-[#111827]">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              aria-label={closeLabel}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          {listContent}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[520px] w-[380px] overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg">
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
      </div>
      {listContent}
    </div>
  );
}
