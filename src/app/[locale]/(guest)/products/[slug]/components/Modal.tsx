"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { CreateOrderServiceForGuestRequest } from "@/types/request/order_service";

interface OrderServiceModalProps {
  open: boolean;
  serviceId?: string;
  serviceName?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateOrderServiceForGuestRequest,
  ) => Promise<void> | void;
}

export default function OrderServiceModal({
  open,
  serviceId,
  serviceName,
  isSubmitting = false,
  onClose,
  onSubmit,
}: OrderServiceModalProps) {
  const t = useTranslations("ProductDetailsPage.orderModal");
  const [quantity, setQuantity] = useState(1);
  const [guestNote, setGuestNote] = useState("");
  const [estimatedAt, setEstimatedAt] = useState("");
  const [estimatedAtError, setEstimatedAtError] = useState("");

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (isSubmitting || !serviceId) return;
    if (!estimatedAt) {
      setEstimatedAtError(t("estimatedAtRequired"));
      return;
    }

    const estimatedDate = new Date(estimatedAt);
    if (Number.isNaN(estimatedDate.getTime())) {
      setEstimatedAtError(t("estimatedAtInvalid"));
      return;
    }

    setEstimatedAtError("");

    const payload: CreateOrderServiceForGuestRequest = {
      service_id: serviceId,
      quantity,
      estimated_at: estimatedDate.toISOString(),
    };

    const trimmedNote = guestNote.trim();
    if (trimmedNote) payload.guest_note = trimmedNote;

    await onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={() => {
        if (isSubmitting) return;
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-screen-sm rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#111827]">{t("title")}</h2>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-base text-[#111827]">{t("serviceLabel")}</span>
          <span className="text-base font-semibold text-[#4b5563]">
            {serviceName || "-"}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-base text-[#111827]">{t("quantityLabel")}</span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              disabled={isSubmitting}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f4f6] text-xl text-[#6b7280] disabled:opacity-50"
            >
              -
            </button>

            <span className="min-w-6 text-center text-base font-semibold text-[#111827]">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity((prev) => prev + 1)}
              disabled={isSubmitting}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f4f6] text-xl text-[#6b7280] disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label
            htmlFor="estimated-at-input"
            className="text-base text-[#111827]"
          >
            {t("estimatedAtLabel")}
          </label>

          <input
            id="estimated-at-input"
            type="datetime-local"
            value={estimatedAt}
            onChange={(event) => {
              setEstimatedAt(event.target.value);
              if (estimatedAtError) setEstimatedAtError("");
            }}
            disabled={isSubmitting}
            className="mt-2 h-10 w-full rounded-xl border border-[#d1d5db] px-4 text-sm text-[#111827] outline-none focus:border-[#8b5cf6]"
          />

          {estimatedAtError ? (
            <p className="mt-1 text-sm text-[#dc2626]">{estimatedAtError}</p>
          ) : null}
        </div>

        <div className="mt-3">
          <label
            htmlFor="guest-note-input"
            className="text-base text-[#111827]"
          >
            {t("guestNoteLabel")}
          </label>

          <textarea
            id="guest-note-input"
            rows={4}
            value={guestNote}
            onChange={(event) => setGuestNote(event.target.value)}
            disabled={isSubmitting}
            placeholder={t("guestNotePlaceholder")}
            className="mt-2 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#d1d5db] focus:border-[#8b5cf6]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={isSubmitting || !serviceId}
          className="mt-6 h-10 w-full rounded-md bg-[#8b5cf6] text-base font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </div>
    </div>
  );
}
