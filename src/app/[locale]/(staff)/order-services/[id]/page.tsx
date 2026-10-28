"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Image, Spin, Tag } from "antd";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BsChevronLeft } from "react-icons/bs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminChatAvailability } from "@/apis/chat";
import {
  getOrderServiceById,
  updateOrderServiceStatusForAdmin,
} from "@/apis/order_service";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useRouter } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import type { OrderService } from "@/types/data/order_service";
import type { User } from "@/types/data/user";
import type { OrderServiceStatus } from "@/types/request/order_service";
import { resolvePublicImageUrl } from "@/utils/media";
import { getServiceDiscountMeta } from "@/utils/service-discount";
import ConfirmOrderServiceModal from "../components/ConfirmOrderServiceModal";

const getOrderServiceFromResponse = (payload: unknown): OrderService | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "order_service" in record &&
    record.order_service &&
    typeof record.order_service === "object"
      ? record.order_service
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const orderService = candidate as OrderService;
  if (!orderService.id) return null;

  return orderService;
};

const resolveStatusTagColor = (value?: OrderServiceStatus) => {
  if (value === "confirmed") return "green";
  if (value === "cancelled") return "red";
  return "gold";
};

const toDisplayText = (value?: string | null) => value?.trim() || "--";

const toTrimmedString = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value).trim();
  }
  return "";
};

const getUserDisplayName = (user?: User | null) => {
  if (!user) return "--";

  const fullName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return fullName || user.username || user.email || "--";
};

interface DetailFieldProps {
  label: string;
  value: ReactNode;
}

const DetailField = ({ label, value }: DetailFieldProps) => {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
        {label}
      </p>
      <div className="text-sm text-[#1b202a] break-words">{value}</div>
    </div>
  );
};

export default function OrderServiceDetailPage() {
  const t = useTranslations("OrderServicesPage");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const currentRole = toTrimmedString(user?.role).toLowerCase();
  const canOpenChat = currentRole !== "admin";

  const orderServiceId = useMemo(() => {
    const rawId = params?.id;
    if (Array.isArray(rawId)) return rawId[0];
    return rawId;
  }, [params]);

  const {
    data: orderServiceRes,
    isFetching: isOrderServiceFetching,
    error: orderServiceError,
  } = useQuery({
    queryKey: queryKeys.orderServices.detail(orderServiceId || ""),
    queryFn: async () => getOrderServiceById(orderServiceId as string),
    enabled: Boolean(orderServiceId),
  });

  useEffect(() => {
    if (orderServiceError) {
      messageApi.errorFromApi(orderServiceError);
    }
  }, [messageApi, orderServiceError]);

  const orderService = useMemo(
    () => getOrderServiceFromResponse(orderServiceRes?.data?.data),
    [orderServiceRes?.data?.data],
  );

  const confirmMutation = useMutation({
    mutationFn: async (variables: { id: string; staff_note?: string }) => {
      const staffNote = variables.staff_note?.trim();
      return await updateOrderServiceStatusForAdmin(variables.id, {
        status: "confirmed",
        ...(staffNote ? { staff_note: staffNote } : {}),
      });
    },
    onSuccess: async (res) => {
      messageApi.fromApi(res.data, "success");
      setIsConfirmModalOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderServices.detail(orderServiceId || ""),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orderServices.all,
        }),
      ]);
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  useEffect(() => {
    if (!orderServiceId) return;
    if (isOrderServiceFetching) return;
    if (orderServiceError) return;
    if (orderService) return;

    messageApi.error(t("detailPage.errors.notFound"));
    router.replace("/order-services");
  }, [
    isOrderServiceFetching,
    messageApi,
    orderService,
    orderServiceError,
    orderServiceId,
    router,
    t,
  ]);

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const formatDateTime = (value?: string) => {
    if (!value) return "--";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return dateTimeFormatter.format(date);
  };

  const formatMoney = (value?: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "--";
    return currencyFormatter.format(value);
  };

  const bookingRoomName = toDisplayText(orderService?.booking_room?.room?.name);
  const serviceId = orderService?.service?.id;
  const serviceName = toDisplayText(orderService?.service?.name);

  const thumbnailUrl = useMemo(() => {
    const thumbnail = orderService?.service?.thumbnail;
    if (!thumbnail) return undefined;

    return resolvePublicImageUrl(thumbnail.url || thumbnail.key || undefined);
  }, [orderService?.service?.thumbnail]);
  const serviceDiscountMeta = getServiceDiscountMeta(orderService?.service);
  const serviceDiscountBadge = useMemo(() => {
    if (!serviceDiscountMeta) return "";

    if (serviceDiscountMeta.type === "percent") {
      return `-${serviceDiscountMeta.value}%`;
    }

    return `-${currencyFormatter.format(serviceDiscountMeta.value)}`;
  }, [currencyFormatter, serviceDiscountMeta]);

  const statusLabel =
    orderService?.status === "confirmed"
      ? t("statuses.confirmed")
      : orderService?.status === "cancelled"
        ? t("statuses.cancelled")
        : t("statuses.pending");

  const isPendingStatus = orderService?.status === "pending";
  const loading = isOrderServiceFetching;
  const actionLoading = loading || confirmMutation.isPending;

  const handleOpenOrderServiceChat = async () => {
    if (!canOpenChat) return;

    const bookingRoomId = toTrimmedString(orderService?.booking_room?.id);
    if (!bookingRoomId) {
      messageApi.error(t("detailPage.chatErrors.missingBookingRoom"));
      return;
    }

    setIsOpeningChat(true);
    try {
      const availabilityRes = await getAdminChatAvailability({
        booking_room_id: bookingRoomId,
      });
      const availability = availabilityRes?.data?.data;
      const chatId = toTrimmedString(availability?.chat_id);
      const hasExistingChat = Boolean(availability?.available && chatId);

      if (hasExistingChat) {
        router.push(`/chats/${encodeURIComponent(chatId)}`);
        return;
      }

      router.push(
        `/chats/preview?booking_room_id=${encodeURIComponent(bookingRoomId)}`,
      );
    } catch (error) {
      messageApi.errorFromApi(error, t("detailPage.chatErrors.unavailable"));
    } finally {
      setIsOpeningChat(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/order-services"
            className="flex items-center text-sm text-gray-500 mb-2"
          >
            <BsChevronLeft className="h-3 w-3" />
            {t("detailPage.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("detailPage.title")}</h1>
        </div>
      </div>

      <div className="px-0 lg:px-16">
        <Spin spinning={loading} size="large">
          <div className="mb-8 flex flex-col gap-4">
            <div className="bg-[#f5f5f5] shadow-sm rounded-xl p-4 md:p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-black">
                  {t("detailPage.sections.orderInfo")} # {orderService?.id}
                </h2>
              </div>

              <div>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="rounded-lg border border-[#d9d9d9] bg-white p-4">
                    <div className="flex gap-4">
                      <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-lg border border-[#d9d9d9] bg-white">
                        {serviceDiscountMeta ? (
                          <span className="absolute left-2 top-2 z-[2] rounded-full bg-[#111827] px-2 py-0.5 text-[11px] font-semibold text-white">
                            {serviceDiscountBadge}
                          </span>
                        ) : null}

                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={serviceName}
                            className="!h-full !w-full !object-cover"
                            fallback=""
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-[#8c8c8c]">
                            {t("detailPage.fields.noImage")}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-y-3 gap-x-4">
                        <DetailField
                          label={t("detailPage.fields.service")}
                          value={
                            serviceId ? (
                              <Link
                                href={`/services/${serviceId}`}
                                className="text-[#1677ff] hover:underline"
                              >
                                {serviceName}
                              </Link>
                            ) : (
                              serviceName
                            )
                          }
                        />

                        <DetailField
                          label={t("detailPage.fields.serviceUnitPrice")}
                          value={
                            <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
                              {formatMoney(orderService?.unit_price)}
                            </Tag>
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-lg grid grid-cols-2 gap-2 border border-[#d9d9d9] bg-white p-4">
                    <DetailField
                      label={t("detailPage.fields.room")}
                      value={bookingRoomName}
                    />
                    <DetailField
                      label={t("detailPage.fields.status")}
                      value={
                        <Tag
                          color={resolveStatusTagColor(orderService?.status)}
                          className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
                        >
                          {statusLabel}
                        </Tag>
                      }
                    />

                    <DetailField
                      label={t("detailPage.fields.quantity")}
                      value={
                        typeof orderService?.quantity === "number"
                          ? String(orderService.quantity)
                          : "--"
                      }
                    />

                    <DetailField
                      label={t("detailPage.fields.totalPrice")}
                      value={
                        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
                          {formatMoney(orderService?.total_price)}
                        </Tag>
                      }
                    />

                    <DetailField
                      label={t("detailPage.fields.estimatedAt")}
                      value={
                        <Tag className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0">
                          {formatDateTime(orderService?.estimated_at)}
                        </Tag>
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-4 text-sm font-semibold tracking-wide text-black">
                  {t("detailPage.sections.notes")}
                </h2>

                <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
                  <DetailField
                    label={t("detailPage.fields.guestNote")}
                    value={toDisplayText(orderService?.guest_note)}
                  />
                  <DetailField
                    label={t("detailPage.fields.staffNote")}
                    value={toDisplayText(orderService?.staff_note)}
                  />
                  <DetailField
                    label={t("detailPage.fields.cancelReason")}
                    value={toDisplayText(orderService?.cancel_reason)}
                  />
                </div>
              </div>

              <div className="mb-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                <h4 className="text-sm font-semibold text-[#374151] mb-3">
                  {t("detailPage.meta.title")}
                </h4>

                <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[#6B7280] mb-1">
                      {t("detailPage.meta.createdBy")}
                    </p>
                    <p className="font-medium text-[#111827]">
                      {getUserDisplayName(orderService?.created_by)}
                    </p>
                  </div>

                  <div className="sm:text-end">
                    <p className="text-[#6B7280] mb-1">
                      {t("detailPage.meta.updatedBy")}
                    </p>
                    <p className="font-medium text-[#111827]">
                      {getUserDisplayName(orderService?.updated_by)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#6B7280] mb-1">
                      {t("detailPage.meta.createdAt")}
                    </p>
                    <p className="font-medium text-[#111827]">
                      {formatDateTime(orderService?.created_at)}
                    </p>
                  </div>

                  <div className="sm:text-end">
                    <p className="text-[#6B7280] mb-1">
                      {t("detailPage.meta.updatedAt")}
                    </p>
                    <p className="font-medium text-[#111827]">
                      {formatDateTime(orderService?.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-1 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              {canOpenChat ? (
                <button
                  type="button"
                  disabled={actionLoading || isOpeningChat}
                  onClick={() => {
                    void handleOpenOrderServiceChat();
                  }}
                  className="w-full cursor-pointer rounded-md border border-[#8b5cf6] bg-white px-3 py-2 text-sm font-medium text-[#7c3aed] transition hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isOpeningChat
                    ? t("detailPage.actions.openingChat")
                    : t("detailPage.actions.message")}
                </button>
              ) : null}
              <Link
                href="/order-services"
                className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium !text-gray-700 transition hover:bg-gray-50 sm:w-auto text-center no-underline"
              >
                {t("detailPage.actions.exit")}
              </Link>
              {isPendingStatus && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsConfirmModalOpen(true)}
                  className="w-full cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {t("detailPage.actions.confirm")}
                </button>
              )}
            </div>
          </div>
        </Spin>
      </div>

      <ConfirmOrderServiceModal
        open={isConfirmModalOpen}
        loading={confirmMutation.isPending}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={({ staff_note }) => {
          if (!orderServiceId) return;
          confirmMutation.mutate({
            id: orderServiceId,
            staff_note,
          });
        }}
      />
    </div>
  );
}
