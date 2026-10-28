"use client";

import {
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGuestChatAvailability } from "@/apis/chat";
import { getGuestSupportCategories } from "@/apis/support_category";
import {
  createSupportTicketForGuest,
  getSupportTicketsForGuest,
  updateSupportTicketStatusForGuest,
} from "@/apis/support_ticket";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import type { SupportTicketPriority } from "@/types/request/support_ticket";
import { Popconfirm } from "antd";

type RequestFormErrors = {
  support_category_id?: string;
  content?: string;
  priority?: string;
};

const PRIORITY_OPTIONS: Array<{
  level: number;
  value: SupportTicketPriority;
  badgeClassName: string;
}> = [
  {
    level: 1,
    value: "urgent",
    badgeClassName: "border-[#fca5a5] text-[#ef4444] bg-[#fef2f2]",
  },
  {
    level: 2,
    value: "high",
    badgeClassName: "border-[#fed7aa] text-[#f97316] bg-[#fff7ed]",
  },
  {
    level: 3,
    value: "medium",
    badgeClassName: "border-[#bfdbfe] text-[#3b82f6] bg-[#eff6ff]",
  },
  {
    level: 4,
    value: "low",
    badgeClassName: "border-[#d1d5db] text-[#6b7280] bg-[#f9fafb]",
  },
];

const resolveTicketStatusMeta = (status?: string) => {
  const normalized = (status || "").trim().toLocaleLowerCase();

  if (normalized === "pending") {
    return {
      labelKey: "pending" as const,
      className: "border-[#fed7aa] text-[#f97316] bg-[#fff7ed]",
      showCancelAction: true,
    };
  }

  if (normalized === "done") {
    return {
      labelKey: "done" as const,
      className: "border-[#99f6e4] text-[#14b8a6] bg-[#f0fdfa]",
      showCancelAction: false,
    };
  }

  if (normalized === "accepted") {
    return {
      labelKey: "accepted" as const,
      className: "border-[#ddd6fe] text-[#8b5cf6] bg-[#f5f3ff]",
      showCancelAction: false,
    };
  }

  if (normalized === "cancelled") {
    return {
      labelKey: "cancelled" as const,
      className: "border-[#fecaca] text-[#ef4444] bg-[#fef2f2]",
      showCancelAction: false,
    };
  }

  return {
    labelKey: "unknown" as const,
    className: "border-[#d1d5db] text-[#6b7280] bg-[#f9fafb]",
    showCancelAction: false,
  };
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

export default function RequestsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("RequestsPage");
  const messageApi = useMessage();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<SupportTicketPriority>("urgent");
  const [errors, setErrors] = useState<RequestFormErrors>({});
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [openingTicketId, setOpeningTicketId] = useState<string | null>(null);
  const ticketListContainerRef = useRef<HTMLDivElement | null>(null);
  const ticketCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const ticketBubbleRef = useRef<HTMLDivElement | null>(null);
  const [ticketBubbleAnchor, setTicketBubbleAnchor] =
    useState<BubbleAnchor | null>(null);
  const [ticketBubblePosition, setTicketBubblePosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const {
    data: supportCategoriesRes,
    error: supportCategoriesError,
    isFetching: isSupportCategoriesFetching,
  } = useQuery({
    queryKey: ["guest", "support-categories"],
    queryFn: async () => getGuestSupportCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: supportTicketsRes,
    error: supportTicketsError,
    isFetching: isSupportTicketsFetching,
  } = useQuery({
    queryKey: ["guest", "support-tickets"],
    queryFn: async () => getSupportTicketsForGuest(),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!supportCategoriesError) return;
    messageApi.errorFromApi(supportCategoriesError);
  }, [messageApi, supportCategoriesError]);

  useEffect(() => {
    if (!supportTicketsError) return;
    messageApi.errorFromApi(supportTicketsError);
  }, [messageApi, supportTicketsError]);

  const createSupportTicketMutation = useMutation({
    mutationFn: createSupportTicketForGuest,
    onSuccess: () => {
      messageApi.success(t("submitSuccess"));
      setSelectedCategoryId("");
      setContent("");
      setPriority("urgent");
      setErrors({});
      void queryClient.invalidateQueries({
        queryKey: ["guest", "support-tickets"],
      });
    },
    onError: (createError) => {
      messageApi.errorFromApi(createError);
    },
  });

  const cancelSupportTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return await updateSupportTicketStatusForGuest(id, {
        status: "cancelled",
      });
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      await queryClient.invalidateQueries({
        queryKey: ["guest", "support-tickets"],
      });
    },
    onError: (cancelError) => {
      messageApi.errorFromApi(cancelError);
    },
  });

  const supportCategories = useMemo(
    () => supportCategoriesRes?.data?.data?.support_categories || [],
    [supportCategoriesRes?.data?.data?.support_categories],
  );

  const supportTickets = useMemo(() => {
    const list = supportTicketsRes?.data?.data?.support_tickets || [];

    return [...list].sort((left, right) => {
      const leftMs = left.created_at ? new Date(left.created_at).getTime() : 0;
      const rightMs = right.created_at
        ? new Date(right.created_at).getTime()
        : 0;
      return rightMs - leftMs;
    });
  }, [supportTicketsRes?.data?.data?.support_tickets]);

  const activeTicket = useMemo(
    () => supportTickets.find((ticket) => ticket.id === activeTicketId) || null,
    [activeTicketId, supportTickets],
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

  const handleToggleTicketBubble = useCallback(
    (ticketId: string, anchor: BubbleAnchor) => {
      if (activeTicketId === ticketId) {
        setActiveTicketId(null);
        setTicketBubbleAnchor(null);
        return;
      }

      setActiveTicketId(ticketId);
      setTicketBubbleAnchor(anchor);
    },
    [activeTicketId],
  );

  const updateTicketBubblePosition = useCallback(() => {
    if (!activeTicketId) {
      setTicketBubblePosition(null);
      return;
    }

    const container = ticketListContainerRef.current;
    const activeCard = ticketCardRefs.current[activeTicketId];

    if (!container || !activeCard) {
      setTicketBubblePosition(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const cardRect = activeCard.getBoundingClientRect();
    const anchor = ticketBubbleAnchor || resolveDefaultBubbleAnchor(activeCard);
    const boundedAnchorX = Math.min(Math.max(anchor.x, 0), cardRect.width);
    const boundedAnchorY = Math.min(Math.max(anchor.y, 0), cardRect.height);
    const rawTop =
      cardRect.top -
      containerRect.top +
      boundedAnchorY -
      BUBBLE_VERTICAL_OFFSET;
    const rawLeft = cardRect.left - containerRect.left + boundedAnchorX;
    const bubbleWidth =
      ticketBubbleRef.current?.getBoundingClientRect().width ||
      BUBBLE_WIDTH_FALLBACK;
    const halfBubbleWidth = bubbleWidth / 2;
    const minLeft = halfBubbleWidth + BUBBLE_SIDE_SAFE_GAP;
    const maxLeft = Math.max(
      minLeft,
      containerRect.width - halfBubbleWidth - BUBBLE_SIDE_SAFE_GAP,
    );

    setTicketBubblePosition({
      top: Math.max(rawTop, BUBBLE_TOP_SAFE_GAP),
      left: Math.min(Math.max(rawLeft, minLeft), maxLeft),
    });
  }, [activeTicketId, resolveDefaultBubbleAnchor, ticketBubbleAnchor]);

  useLayoutEffect(() => {
    if (!activeTicketId) return;
    const animationFrameId = window.requestAnimationFrame(() => {
      updateTicketBubblePosition();
    });
    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [activeTicketId, supportTickets.length, updateTicketBubblePosition]);

  useEffect(() => {
    if (!activeTicketId) return;

    const handleReposition = () => {
      updateTicketBubblePosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [activeTicketId, updateTicketBubblePosition]);

  const validateForm = () => {
    const nextErrors: RequestFormErrors = {};

    if (!selectedCategoryId.trim()) {
      nextErrors.support_category_id = t("errors.supportCategoryRequired");
    }

    if (!content.trim()) {
      nextErrors.content = t("errors.contentRequired");
    }

    if (!priority) {
      nextErrors.priority = t("errors.priorityRequired");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    await createSupportTicketMutation.mutateAsync({
      support_category_id: selectedCategoryId,
      content: content.trim(),
      priority,
    });
  };

  const handleOpenTicketChat = async (
    supportCategoryId?: string,
    ticketId?: string,
  ) => {
    const normalizedSupportCategoryId = supportCategoryId?.trim() || "";

    if (!normalizedSupportCategoryId) {
      messageApi.error(t("chatErrors.missingSupportCategory"));
      return;
    }

    const normalizedTicketId = ticketId?.trim() || "";
    setOpeningTicketId(normalizedTicketId || null);

    try {
      const availabilityRes = await getGuestChatAvailability({
        support_category_id: normalizedSupportCategoryId,
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
      setOpeningTicketId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-24">
      <section className="p-4 pb-3">
        <h1 className="text-xl mt-4 font-bold text-[#111827]">{t("title")}</h1>

        <div className="mt-4">
          <h2 className="text-base font-semibold text-[#2f2b27]">
            {t("supportCategoryTitle")}
          </h2>

          {isSupportCategoriesFetching ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-7 animate-pulse rounded-md bg-[#f3f4f6]"
                />
              ))}
            </div>
          ) : supportCategories.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {supportCategories.map((category) => {
                const isSelected = selectedCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setErrors((prev) => ({
                        ...prev,
                        support_category_id: undefined,
                      }));
                    }}
                    className={`h-7 rounded-md border text-sm font-semibold transition-colors ${
                      isSelected
                        ? "border-[#8b5cf6] bg-[#8b5cf6] text-white"
                        : "border-[#9ca3af] bg-white text-[#6b7280]"
                    }`}
                  >
                    {category.name || "-"}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-[#faf5ff] px-3 py-2 text-sm text-[#6b21a8]">
              {t("supportCategoryEmpty")}
            </p>
          )}

          {errors.support_category_id ? (
            <p className="mt-2 text-xs text-[#ef4444]">
              {errors.support_category_id}
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <h2 className="text-base font-semibold text-[#2f2b27]">
            {t("contentTitle")}
          </h2>
          <textarea
            value={content}
            onChange={(event) => {
              setContent(event.target.value);
              if (event.target.value.trim()) {
                setErrors((prev) => ({ ...prev, content: undefined }));
              }
            }}
            placeholder={t("contentPlaceholder")}
            rows={7}
            className="mt-2 w-full rounded-lg border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] shadow-[0_2px_8px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#c4c4c4] focus:border-[#8b5cf6]"
          />
          {errors.content ? (
            <p className="mt-2 text-xs text-[#ef4444]">{errors.content}</p>
          ) : null}
        </div>

        <div className="mt-4">
          <h2 className="text-base font-semibold text-[#2f2b27]">
            {t("priorityTitle")}
          </h2>

          <div className="mt-4 grid grid-cols-4 gap-3">
            {PRIORITY_OPTIONS.map((option) => {
              const isSelected = option.value === priority;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPriority(option.value);
                    setErrors((prev) => ({ ...prev, priority: undefined }));
                  }}
                  className={`h-7 rounded-md border border-gray-800 text-sm font-semibold transition-colors ${
                    isSelected
                      ? "border-[#8b5cf6] bg-[#8b5cf6] text-white"
                      : "border-[#9ca3af] bg-white text-[#6b7280]"
                  }`}
                >
                  {option.level}
                </button>
              );
            })}
          </div>

          {errors.priority ? (
            <p className="mt-2 text-sm text-[#ef4444]">{errors.priority}</p>
          ) : null}

          <div className="mt-5 space-y-3">
            {PRIORITY_OPTIONS.map((option) => (
              <div
                key={`description-${option.value}`}
                className="text-[#111827]"
              >
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-sm font-semibold ${option.badgeClassName}`}
                >
                  {t(`priorityDescriptions.${option.value}.label`)}
                </span>
                <span className="ml-2 text-xs">
                  : {t(`priorityDescriptions.${option.value}.description`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full mt-8">
          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={createSupportTicketMutation.isPending}
            className="h-8 w-full rounded-md bg-[#8b5cf6] text-base font-bold text-white shadow-[0_2px_10px_rgba(139,92,246,0.35)] disabled:cursor-not-allowed disabled:bg-[#c4b5fd]"
          >
            {createSupportTicketMutation.isPending
              ? t("submitting")
              : t("submit")}
          </button>
        </div>
      </section>

      <hr className="text-gray-400 mx-4 my-4" />

      <section className="px-4">
        <h2 className="text-base font-semibold text-[#2f2b27]">
          {t("ticketListTitle")}
        </h2>

        {isSupportTicketsFetching ? (
          <div className="mt-4 space-y-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-xl bg-[#f3f4f6]"
              />
            ))}
          </div>
        ) : supportTickets.length > 0 ? (
          <div ref={ticketListContainerRef} className="relative mt-4">
            <div className="space-y-4">
              {supportTickets.map((ticket) => {
                const normalizedPriority = (ticket.priority || "")
                  .trim()
                  .toLocaleLowerCase() as SupportTicketPriority;
                const priorityOption = PRIORITY_OPTIONS.find(
                  (item) => item.value === normalizedPriority,
                );
                const statusMeta = resolveTicketStatusMeta(ticket.status);

                return (
                  <article
                    key={ticket.id}
                    ref={(element) => {
                      ticketCardRefs.current[ticket.id] = element;
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      handleToggleTicketBubble(
                        ticket.id,
                        resolveBubbleAnchorFromClick(event),
                      );
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      const fallbackAnchor = resolveDefaultBubbleAnchor(
                        event.currentTarget as HTMLElement,
                      );
                      handleToggleTicketBubble(ticket.id, fallbackAnchor);
                    }}
                    className="overflow-hidden rounded-xl border border-[#d1d5db] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] outline-none transition active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/35"
                  >
                    <div className="px-3 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-bold text-[#111827]">
                          {ticket.support_category?.name || "-"}
                        </h3>
                        <span
                          className={`inline-flex rounded-md border px-3 py-0.5 text-xs font-semibold ${
                            priorityOption?.badgeClassName ||
                            "border-[#d1d5db] text-[#6b7280] bg-[#f9fafb]"
                          }`}
                        >
                          {priorityOption
                            ? t(
                                `priorityDescriptions.${priorityOption.value}.label`,
                              )
                            : "-"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-start justify-between gap-4">
                        <span className="text-sm text-[#111827]">
                          {t("ticketFields.content")}
                        </span>
                        <p className="max-w-[65%] text-right text-sm leading-6 text-[#5b5b5b]">
                          {ticket.content || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#e5e7eb] px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.25 text-xs font-semibold ${statusMeta.className}`}
                      >
                        {t(`ticketStatuses.${statusMeta.labelKey}`)}
                      </span>

                      {statusMeta.showCancelAction ? (
                        <Popconfirm
                          title={t("actions.cancelConfirm")}
                          okText={t("actions.cancel")}
                          cancelText={t("actions.keepRequest")}
                          okButtonProps={{ danger: true }}
                          onConfirm={(event) => {
                            event?.stopPropagation();
                            void cancelSupportTicketMutation.mutateAsync(
                              ticket.id,
                            );
                          }}
                          onCancel={(event) => {
                            event?.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                            disabled={cancelSupportTicketMutation.isPending}
                            className="h-6 rounded-lg border border-[#ef4444] bg-white px-2 text-xs font-semibold text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {t("actions.cancel")}
                          </button>
                        </Popconfirm>
                      ) : (
                        <span className="h-6" />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {activeTicket ? (
              <div
                className="absolute z-20"
                style={{
                  top: ticketBubblePosition?.top || 0,
                  left: ticketBubblePosition?.left || 0,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <div
                  ref={ticketBubbleRef}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (openingTicketId === activeTicket.id) return;
                    void handleOpenTicketChat(
                      activeTicket.support_category?.id,
                      activeTicket.id,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    if (openingTicketId === activeTicket.id) return;
                    void handleOpenTicketChat(
                      activeTicket.support_category?.id,
                      activeTicket.id,
                    );
                  }}
                  aria-disabled={openingTicketId === activeTicket.id}
                  className={`flex items-center gap-1 rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(124,58,237,0.38)] outline-none transition focus-visible:ring-2 focus-visible:ring-[#c4b5fd] ${
                    openingTicketId === activeTicket.id
                      ? "cursor-wait opacity-85"
                      : "cursor-pointer hover:bg-[#6d28d9]"
                  }`}
                >
                  <span>
                    {openingTicketId === activeTicket.id
                      ? t("actions.openingChat")
                      : t("actions.message")}
                  </span>
                </div>
                <span className="pointer-events-none absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#7c3aed]" />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-[#faf5ff] px-3 py-2 text-sm text-[#6b21a8]">
            {t("ticketListEmpty")}
          </p>
        )}
      </section>
    </div>
  );
}
