import { ToastType } from "@/types/data/toast";
import { IconType } from "react-icons";
import { FaInfoCircle, FaSpinner } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";
import { GoXCircle } from "react-icons/go";
import { PiWarningCircle } from "react-icons/pi";

type ToastStyle = {
  icon: IconType;
  iconClassName: string;
  textColor: string;
};

export const TOAST_ICON_SIZE = 45;

export const TOAST_CONFIG: Record<ToastType, ToastStyle> = {
  success: {
    icon: FiCheckCircle,
    iconClassName: "text-emerald-500",
    textColor: "text-gray-800",
  },
  error: {
    icon: GoXCircle,
    iconClassName: "text-red-500",
    textColor: "text-gray-800",
  },
  warning: {
    icon: PiWarningCircle,
    iconClassName: "text-yellow-500",
    textColor: "text-gray-800",
  },
  info: {
    icon: FaInfoCircle,
    iconClassName: "text-blue-500",
    textColor: "text-gray-800",
  },
  loading: {
    icon: FaSpinner,
    iconClassName: "text-blue-500 animate-spin",
    textColor: "text-gray-800",
  },
};
