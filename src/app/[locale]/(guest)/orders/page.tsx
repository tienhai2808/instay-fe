"use client";

import Image from "next/image";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGuestChatAvailability } from "@/apis/chat";
import {
  getOrderServicesForGuest,
  updateOrderServiceStatusForGuest,
} from "@/apis/order_service";
import { LOCALE_VI } from "@/constants/locale";
import { Link, useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { OrderService } from "@/types/data/order_service";
import { resolvePublicImageUrl } from "@/utils/media";
import CancelOrderModal from "./components/CancelOrderModal";

const resolveOrderStatusMeta = (status?: string) => {
  const normalizedStatus = (status || "").trim().toLocaleLowerCase();

  if (normalizedStatus === "pending") {
    return {
      labelKey: "pending" as const,
      badgeClassName: "border-[#fed7aa] bg-[#fff7ed] text-[#f97316]",
      showCancelAction: true,
    };
  }

  if (normalizedStatus === "confirmed") {
    return {
      labelKey: "confirmed" as const,
      badgeClassName: "border-[#99f6e4] bg-[#f0fdfa] text-[#14b8a6]",
      showCancelAction: false,
    };
  }

  if (normalizedStatus === "cancelled") {
    return {
      labelKey: "cancelled" as const,
      badgeClassName: "border-[#fecaca] bg-[#fef2f2] text-[#ef4444]",
      showCancelAction: false,
    };
  }

  return {
    labelKey: "unknown" as const,
    badgeClassName: "border-[#d1d5db] bg-[#f9fafb] text-[#6b7280]",
    showCancelAction: false,
  };
};

const getServiceThumbnailUrl = (orderService?: OrderService | null) => {
  const thumbnail = orderService?.service?.thumbnail;
  return resolvePublicImageUrl(thumbnail?.url || thumbnail?.key || undefined);
};

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }
  return "";
};

type BubbleAnchor = {
  x: number;
  y: number;
};

const BUBBLE_VERTICAL_OFFSET = 10;
const BUBBLE_TOP_SAFE_GAP = 12;
const BUBBLE_SIDE_SAFE_GAP = 10;
const BUBBLE_WIDTH_FALLBACK = 120;

export default function OrdersPage() {
  const locale = useLocale();
  const t = useTranslations("OrdersPage");
  const router = useRouter();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const [cancellingOrder, setCancellingOrder] = useState<{
    id: string;
    serviceName?: string;
  } | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);
  const orderListContainerRef = useRef<HTMLDivElement | null>(null);
  const orderCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const orderBubbleRef = useRef<HTMLDivElement | null>(null);
  const [orderBubbleAnchor, setOrderBubbleAnchor] =
    useState<BubbleAnchor | null>(null);
  const [orderBubblePosition, setOrderBubblePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const {
    data: orderServicesRes,
    error: orderServicesError,
    isFetching: isOrderServicesFetching,
  } = useQuery({
    queryKey: ["guest", "order-services"],
    queryFn: async () => getOrderServicesForGuest(),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!orderServicesError) return;
    messageApi.errorFromApi(orderServicesError);
  }, [messageApi, orderServicesError]);

  const cancelOrderMutation = useMutation({
    mutationFn: async (variables: { id: string; cancelReason?: string }) => {
      const trimmedReason = variables.cancelReason?.trim();

      return await updateOrderServiceStatusForGuest(variables.id, {
        status: "cancelled",
        ...(trimmedReason ? { cancel_reason: trimmedReason } : {}),
      });
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setCancellingOrder(null);
      await queryClient.invalidateQueries({
        queryKey: ["guest", "order-services"],
      });
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const orderServices = useMemo(() => {
    const list = orderServicesRes?.data?.data?.order_services || [];

    return [...list].sort((left, right) => {
      const leftMs = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightMs = right.created_at
        ? new Date(right.created_at).getTime()
        : 0;
      return rightMs - leftMs;
    });
  }, [orderServicesRes?.data?.data?.order_services]);

  const activeOrder = useMemo(
    () => orderServices.find((order) => order.id === activeOrderId) || null,
    [activeOrderId, orderServices],
  );

  const resolveDefaultBubbleAnchor = useCallback(
    (card: HTMLElement): BubbleAnchor => {
      const rect = card.getBoundingClientRect();
      return {
        x: rect.width / 2,
        y: Math.min(rect.height * 0.4, 44),
      };
    },
    [],
  );

  const resolveBubbleAnchorFromClick = useCallback(
    (event: MouseEvent<HTMLElement>): BubbleAnchor => {
      const cardRect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - cardRect.left,
        y: event.clientY - cardRect.top,
      };
    },
    [],
  );

  const handleToggleOrderBubble = useCallback(
    (orderId: string, anchor: BubbleAnchor) => {
      if (activeOrderId === orderId) {
        setActiveOrderId(null);
        setOrderBubbleAnchor(null);
        return;
      }

      setActiveOrderId(orderId);
      setOrderBubbleAnchor(anchor);
    },
    [activeOrderId],
  );

  const updateOrderBubblePosition = useCallback(() => {
    if (!activeOrderId) {
      setOrderBubblePosition(null);
      return;
    }

    const container = orderListContainerRef.current;
    const activeCard = orderCardRefs.current[activeOrderId];

    if (!container || !activeCard) {
      setOrderBubblePosition(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();
    const anchor = orderBubbleAnchor || resolveDefaultBubbleAnchor(activeCard);
    const boundedAnchorX = Math.min(Math.max(anchor.x, 0), cardRect.width);
    const boundedAnchorY = Math.min(Math.max(anchor.y, 0), cardRect.height);
    const rawTop =
      cardRect.top -
      containerRect.top +
      boundedAnchorY -
      BUBBLE_VERTICAL_OFFSET;
    const rawLeft = cardRect.left - containerRect.left + boundedAnchorX;
    const bubbleWidth =
      orderBubbleRef.current?.getBoundingClientRect().width ||
      BUBBLE_WIDTH_FALLBACK;
    const halfBubbleWidth = bubbleWidth / 2;
    const minLeft = halfBubbleWidth + BUBBLE_SIDE_SAFE_GAP;
    const maxLeft = Math.max(
      minLeft,
      containerRect.width - halfBubbleWidth - BUBBLE_SIDE_SAFE_GAP,
    );

    setOrderBubblePosition({
      top: Math.max(rawTop, BUBBLE_TOP_SAFE_GAP),
      left: Math.min(Math.max(rawLeft, minLeft), maxLeft),
    });
  }, [activeOrderId, orderBubbleAnchor, resolveDefaultBubbleAnchor]);

  useLayoutEffect(() => {
    if (!activeOrderId) return;
    const animationFrameId = window.requestAnimationFrame(() => {
      updateOrderBubblePosition();
    });
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [activeOrderId, orderServices.length, updateOrderBubblePosition]);

  useEffect(() => {
    if (!activeOrderId) return;

    const handleReposition = () => {
      updateOrderBubblePosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [activeOrderId, updateOrderBubblePosition]);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const formatVnd = (price?: number) => {
    const safePrice =
      typeof price === "number" && Number.isFinite(price)
        ? Math.max(0, price)
        : 0;

    return `${priceFormatter.format(Math.round(safePrice))} VND`;
  };

  const handleOpenOrderChat = async (serviceId?: string, orderId?: string) => {
    const normalizedServiceId = serviceId?.trim() || "";

    if (!normalizedServiceId) {
      messageApi.error(t("chatErrors.missingService"));
      return;
    }

    const normalizedOrderId = orderId?.trim() || "";
    setOpeningOrderId(normalizedOrderId || null);

    try {
      const availabilityRes = await getGuestChatAvailability({
        service_id: normalizedServiceId,
      });
      const availability = availabilityRes?.data?.data;
      const departmentId = toTrimmedString(availability?.department_id);
      const chatId = toTrimmedString(availability?.chat_id);
      const hasExistingChat = Boolean(availability?.available && chatId);

      if (hasExistingChat) {
        router.push(`/messages/${encodeURIComponent(chatId)}`);
        return;
      }

      if (departmentId) {
        router.push(
          `/messages/preview?department_id=${encodeURIComponent(departmentId)}`,
        );
        return;
      }

      messageApi.error(t("chatErrors.unavailable"));
    } catch (error) {
      messageApi.errorFromApi(error);
    } finally {
      setOpeningOrderId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-24">
      <section className="p-4 pb-3">
        <h1 className="mt-4 text-xl font-bold text-[#111827]">{t("title")}</h1>

        {isOrderServicesFetching ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm"
              >
                <div className="flex gap-3 p-3">
                  <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-[#efe9ff]" />
                  <div className="min-w-0 flex-1">
                    <div className="h-6 w-1/2 animate-pulse rounded-md bg-[#f3f4f6]" />
                    <div className="mt-2 h-4 w-1/3 animate-pulse rounded-md bg-[#f3f4f6]" />
                    <div className="mt-2 h-5 w-2/5 animate-pulse rounded-md bg-[#f3f4f6]" />
                    <div className="mt-2 h-5 w-3/5 animate-pulse rounded-md bg-[#f3f4f6]" />
                  </div>
                </div>
                <div className="h-14 animate-pulse border-t border-[#e5e7eb] bg-[#f9fafb]" />
              </div>
            ))}
          </div>
        ) : orderServices.length > 0 ? (
          <div ref={orderListContainerRef} className="relative mt-4">
            <div className="space-y-3">
              {orderServices.map((orderService) => {
                const statusMeta = resolveOrderStatusMeta(orderService.status);
                const serviceSlug = (
                  orderService.service?.slug ||
                  orderService.service?.id ||
                  ""
                ).trim();
                const canReorder = serviceSlug.length > 0;
                const reorderHref = canReorder
                  ? `/products/${serviceSlug}`
                  : "/home";
                const thumbnailUrl = getServiceThumbnailUrl(orderService);
                const serviceName =
                  orderService.service?.name?.trim() || t("serviceFallback");
                const quantity =
                  typeof orderService.quantity === "number" &&
                  Number.isFinite(orderService.quantity) &&
                  orderService.quantity > 0
                    ? Math.floor(orderService.quantity)
                    : 1;
                const guestNote = orderService.guest_note?.trim();
                const staffNote = orderService.staff_note?.trim();
                const cancelReason = orderService.cancel_reason?.trim();
                const unitPrice =
                  typeof orderService.unit_price === "number"
                    ? orderService.unit_price
                    : orderService.service?.price;

                return (
                  <article
                    key={orderService.id}
                    ref={(element) => {
                      orderCardRefs.current[orderService.id] = element;
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      handleToggleOrderBubble(
                        orderService.id,
                        resolveBubbleAnchorFromClick(event),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      const fallbackAnchor = resolveDefaultBubbleAnchor(
                        event.currentTarget as HTMLElement,
                      );
                      handleToggleOrderBubble(orderService.id, fallbackAnchor);
                    }}
                    className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-sm outline-none transition active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/35"
                  >
                    <div className="flex gap-3 p-2">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#efe9ff]">
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={serviceName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 text-sm font-bold text-[#111827]">
                            {serviceName}
                          </h2>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.25 text-xs font-semibold ${statusMeta.badgeClassName}`}
                            >
                              {t(`statuses.${statusMeta.labelKey}`)}
                            </span>
                          </div>
                        </div>

                        <p className="text-[8px] text-[#585a5f]">
                          {formatVnd(unitPrice)}
                        </p>

                        <p className="mt-1 text-xs text-[#111827]">
                          {t("fields.quantity")}: {quantity}
                        </p>

                        <p className="mt-1 line-clamp-1 text-xs text-[#111827]">
                          {t("fields.guestNote")}: {guestNote || t("emptyNote")}
                        </p>

                        {staffNote ? (
                          <p className="mt-1 line-clamp-1 text-xs text-[#111827]">
                            {t("fields.staffNote")}: {staffNote}
                          </p>
                        ) : null}

                        {cancelReason ? (
                          <p className="mt-1 line-clamp-1 text-xs text-[#ef4444]">
                            {t("fields.cancelReason")}: {cancelReason}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#e5e7eb] px-3 py-2">
                      {statusMeta.showCancelAction ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setCancellingOrder({
                              id: orderService.id,
                              serviceName,
                            });
                          }}
                          disabled={cancelOrderMutation.isPending}
                          className="h-6 rounded-lg border border-[#ef4444] bg-white px-2 text-xs font-semibold text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {t("actions.cancel")}
                        </button>
                      ) : canReorder ? (
                        <Link
                          href={reorderHref}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="inline-flex h-6 items-center justify-center rounded-lg border border-[#3b82f6] bg-[#eff6ff] px-2 text-xs font-semibold text-[#3b82f6]"
                        >
                          {t("actions.reorder")}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="h-10 min-w-[116px] cursor-not-allowed rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 text-base font-semibold text-[#9ca3af]"
                        >
                          {t("actions.reorder")}
                        </button>
                      )}

                      <p className="text-sm font-bold text-[#111827]">
                        {t("fields.total")}:{" "}
                        {formatVnd(orderService.total_price)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
            {activeOrder ? (
              <div
                className="absolute z-20"
                style={{
                  top: orderBubblePosition?.top || 0,
                  left: orderBubblePosition?.left || 0,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div
                  ref={orderBubbleRef}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (openingOrderId === activeOrder.id) return;
                    void handleOpenOrderChat(
                      activeOrder.service?.id,
                      activeOrder.id,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (openingOrderId === activeOrder.id) return;
                    void handleOpenOrderChat(
                      activeOrder.service?.id,
                      activeOrder.id,
                    );
                  }}
                  aria-disabled={openingOrderId === activeOrder.id}
                  className={`flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.38)] outline-none transition focus-visible:ring-2 focus-visible:ring-[#c4b5fd] ${
                    openingOrderId === activeOrder.id
                      ? "cursor-wait opacity-85"
                      : "cursor-pointer hover:bg-[#6d28d9]"
                  }`}
                >
                  <span>
                    {openingOrderId === activeOrder.id
                      ? t("actions.openingChat")
                      : t("actions.message")}
                  </span>
                </div>
                <span className="pointer-events-none absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#7c3aed]" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
            {t("empty")}
          </p>
        )}
      </section>

      <CancelOrderModal
        open={Boolean(cancellingOrder)}
        serviceName={cancellingOrder?.serviceName}
        isSubmitting={cancelOrderMutation.isPending}
        onClose={() => {
          if (cancelOrderMutation.isPending) return;
          setCancellingOrder(null);
        }}
        onSubmit={async (cancelReason) => {
          if (!cancellingOrder?.id) return;

          await cancelOrderMutation.mutateAsync({
            id: cancellingOrder.id,
            cancelReason,
          });
        }}
      />
    </div>
  );
}
