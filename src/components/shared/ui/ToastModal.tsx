import { ToastItem } from "@/types/data/toast";
import { createPortal } from "react-dom";
import { ToastCenterModal } from "./ToastCenterModal";

export const ToastModal = ({
  toasts,
  onClose,
}: {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}) => {
  if (typeof window === "undefined" || toasts.length === 0) return null;

  const latest = toasts[toasts.length - 1];

  return createPortal(
    <ToastCenterModal toast={latest} onClose={() => onClose(latest.id)} />,
    document.body,
  );
};
