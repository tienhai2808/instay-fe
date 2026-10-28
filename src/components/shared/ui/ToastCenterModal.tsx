/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { ToastItem } from "@/types/data/toast";
import { useEffect, useRef, useState } from "react";
import { getCookie } from "@/utils/cookies";
import { NEXT_LOCALE_COOKIE, resolveLocale } from "@/constants/locale";
import { TOAST_CONFIG, TOAST_ICON_SIZE } from "@/constants/toast";
import enMessages from "@/messages/en.json";
import viMessages from "@/messages/vi.json";

export const ToastCenterModal = ({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { icon: Icon, iconClassName, textColor } = TOAST_CONFIG[toast.type];
  const [visible, setVisible] = useState(false);
  const locale = resolveLocale(getCookie(NEXT_LOCALE_COOKIE));
  const messages = locale === "vi" ? viMessages : enMessages;
  const acknowledgeLabel = messages?.Common?.acknowledge || "Got it";
  const actionButtonClassName = toast.actionLabel
    ? toast.type === "info"
      ? "bg-[#155DFC] hover:bg-[#0E4BD1]"
      : "bg-[#8b5cf6] hover:bg-violet-400"
    : "bg-[#8b5cf6] hover:bg-violet-400";

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(0,0,0,0.1)",
        opacity: visible ? 1 : 0,
        transition: "opacity 200ms ease",
      }}
    >
      <div
        ref={modalRef}
        className="relative flex w-[calc(100vw-24px)] max-w-80 flex-col items-center gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8"
        style={{
          transform: visible ? "scale(1)" : "scale(0.8)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 200ms cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 200ms ease",
        }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center">
          <Icon size={TOAST_ICON_SIZE} className={iconClassName} />
        </div>

        <p className={`text-base text-center ${textColor}`}>{toast.message}</p>

        {toast.type !== "loading" && (
          <button
            onClick={() => {
              toast.onAction?.();
              handleClose();
            }}
            className={`mt-1 cursor-pointer px-6 py-1.5 rounded-lg border border-gray-200 text-sm text-white transition ${actionButtonClassName}`}
          >
            {toast.actionLabel || acknowledgeLabel}
          </button>
        )}
      </div>
    </div>
  );
};
