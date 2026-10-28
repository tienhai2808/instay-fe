"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface CancelOrderModalProps {
  open: boolean;
  serviceName?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (cancelReason?: string) => Promise<void> | void;
}

export default function CancelOrderModal({
  open,
  serviceName,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CancelOrderModalProps) {
  const t = useTranslations("OrdersPage.cancelModal");
  const [cancelReason, setCancelReason] = useState("");
  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setCancelReason("");
    onClose();
  }, [isSubmitting, onClose]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const trimmedReason = cancelReason.trim();
    try {
      await onSubmit(trimmedReason ? trimmedReason : undefined);
      setCancelReason("");
    } catch {
      // Keep user input so they can retry without retyping.
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-screen-sm rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-[#111827]">{t("title")}</h2>

        <p className="mt-3 text-sm text-[#4b5563]">{t("confirmText")}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-base text-[#111827]">{t("serviceLabel")}</span>
          <span className="max-w-[60%] truncate text-right text-base font-semibold text-[#4b5563]">
            {serviceName?.trim() || "-"}
          </span>
        </div>

        <div className="mt-3">
          <label
            htmlFor="cancel-order-reason-input"
            className="text-base text-[#111827]"
          >
            {t("reasonLabel")}
          </label>

          <textarea
            id="cancel-order-reason-input"
            rows={4}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            disabled={isSubmitting}
            placeholder={t("reasonPlaceholder")}
            className="mt-2 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#d1d5db] focus:border-[#8b5cf6]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={isSubmitting}
          className="mt-6 h-10 w-full rounded-md bg-[#ef4444] text-base font-semibold text-white disabled:opacity-70"
        >
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </div>
    </div>
  );
}
