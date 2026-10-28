"use client";

import { Modal, Tag } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import type { SupportTicket } from "@/types/data/support_ticket";
import type {
  SupportTicketAdminUpdateStatus,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/types/request/support_ticket";
import type { User } from "@/types/data/user";

interface SupportTicketDetailModalProps {
  open: boolean;
  loading?: boolean;
  chatLoading?: boolean;
  showChatAction?: boolean;
  supportTicket?: SupportTicket | null;
  onClose: () => void;
  onOpenChat?: () => void;
  onUpdateStatus?: (status: SupportTicketAdminUpdateStatus) => void;
}

const resolvePriorityTagColor = (value?: SupportTicketPriority) => {
  if (value === "urgent") return "red";
  if (value === "high") return "volcano";
  if (value === "medium") return "blue";
  return "default";
};

const resolveStatusTagColor = (value?: SupportTicketStatus) => {
  if (value === "accepted") return "blue";
  if (value === "cancelled") return "red";
  if (value === "done") return "green";
  return "gold";
};

const getUserDisplayName = (user?: User | null) => {
  if (!user) return "--";

  const fullName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  return fullName || user.username || user.email || "--";
};

const toDisplayText = (value?: string | null) => value?.trim() || "--";

export default function SupportTicketDetailModal({
  open,
  loading = false,
  chatLoading = false,
  showChatAction = false,
  supportTicket,
  onClose,
  onOpenChat,
  onUpdateStatus,
}: SupportTicketDetailModalProps) {
  const t = useTranslations("SupportTicketsPage");
  const locale = useLocale();

  const dateTimeFormatter = new Intl.DateTimeFormat(
    locale === LOCALE_VI ? "vi-VN" : "en-US",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const formatDateTime = (value?: string) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return dateTimeFormatter.format(date);
  };

  const formatResolutionDuration = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
      return "--";
    }

    if (value < 60) {
      return `${Math.floor(value)} ${t("modal.duration.seconds")}`;
    }

    if (value < 60 * 60) {
      return `${Math.floor(value / 60)} ${t("modal.duration.minutes")}`;
    }

    if (value < 60 * 60 * 24) {
      return `${Math.floor(value / (60 * 60))} ${t("modal.duration.hours")}`;
    }

    return `${Math.floor(value / (60 * 60 * 24))} ${t("modal.duration.days")}`;
  };

  const resolveStatusLabel = (value?: SupportTicketStatus) => {
    if (value === "accepted") return t("statuses.accepted");
    if (value === "cancelled") return t("statuses.cancelled");
    if (value === "done") return t("statuses.done");
    return t("statuses.pending");
  };

  const resolvePriorityLabel = (value?: SupportTicketPriority) => {
    if (value === "urgent") return t("priorities.urgent");
    if (value === "high") return t("priorities.high");
    if (value === "medium") return t("priorities.medium");
    return t("priorities.low");
  };

  const nextStatusAction =
    supportTicket?.status === "pending"
      ? {
          status: "accepted" as const,
          label: t("modal.actions.confirm"),
        }
      : supportTicket?.status === "accepted"
        ? {
            status: "done" as const,
            label: t("modal.actions.complete"),
          }
        : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(720px, calc(100vw - 24px))"
      title={
        <span className="text-xl font-bold text-gray-800">
          {t("modal.title")}
        </span>
      }
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.requestType")}
              </p>
              <p className="text-sm font-medium text-[#111827]">
                {toDisplayText(supportTicket?.support_category?.name)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.room")}
              </p>
              <p className="text-sm font-medium text-[#111827]">
                {toDisplayText(supportTicket?.booking_room?.room?.name)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.priority")}
              </p>
              <Tag
                color={resolvePriorityTagColor(supportTicket?.priority)}
                className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
              >
                {resolvePriorityLabel(supportTicket?.priority)}
              </Tag>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.status")}
              </p>
              <Tag
                color={resolveStatusTagColor(supportTicket?.status)}
                className="!border !border-solid !border-[#d9d9d9] !text-sm !leading-5 !font-normal !px-2 !py-0"
              >
                {resolveStatusLabel(supportTicket?.status)}
              </Tag>
            </div>

            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.content")}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-[#111827]">
                {toDisplayText(supportTicket?.content)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                {t("modal.fields.resolutionTime")}
              </p>
              <p className="text-sm font-medium text-[#111827]">
                {formatResolutionDuration(supportTicket?.resolution_seconds)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-[#374151] mb-3">
            {t("modal.meta.title")}
          </h4>

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[#6B7280] mb-1">{t("modal.meta.createdAt")}</p>
              <p className="font-medium text-[#111827]">
                {formatDateTime(supportTicket?.created_at)}
              </p>
            </div>

            <div className="sm:text-end">
              <p className="text-[#6B7280] mb-1">{t("modal.meta.updatedAt")}</p>
              <p className="font-medium text-[#111827]">
                {formatDateTime(supportTicket?.updated_at)}
              </p>
            </div>

            <div>
              <p className="text-[#6B7280] mb-1">{t("modal.meta.updatedBy")}</p>
              <p className="font-medium text-[#111827]">
                {getUserDisplayName(supportTicket?.updated_by)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        {showChatAction ? (
          <button
            type="button"
            onClick={onOpenChat}
            disabled={loading || chatLoading}
            className="w-full rounded-md border border-[#8b5cf6] bg-white px-6 py-2 text-sm font-medium text-[#7c3aed] transition hover:bg-[#f5f3ff] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {chatLoading
              ? t("modal.actions.openingChat")
              : t("modal.actions.message")}
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          disabled={loading || chatLoading}
          className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
        >
          {t("modal.actions.close")}
        </button>

        {nextStatusAction ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              onUpdateStatus?.(nextStatusAction.status);
            }}
            className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:w-auto"
          >
            {loading ? t("modal.actions.processing") : nextStatusAction.label}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
