"use client";

import { FiUser } from "react-icons/fi";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { logOut } from "@/apis/auth";
import { useMessage } from "@/providers/MessageProvider";
import { useAuthStore } from "@/stores/useAuthStore";
import { clearFCMToken } from "@/services/fcm";
import { resolvePublicImageUrl } from "@/utils/media";
import { useLocale, useTranslations } from "next-intl";
import Cookies from "js-cookie";
import { usePathname, useRouter as useI18nRouter } from "@/i18n/routing";
import { NEXT_LOCALE_COOKIE } from "@/constants/locale";
import { clearClientAuthData } from "@/utils/auth-session";
import { IoMenuOutline } from "react-icons/io5";
import { useMutation } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/staff/layout/NotificationDropdown";
import { ActionDropdown } from "@/components/staff/layout/ActionDropdown";

interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

const STAFF_ROLE = "staff";

const normalizeRole = (value?: string) => value?.trim().toLowerCase() ?? "";

export function Header({ onOpenMobileSidebar }: HeaderProps) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const i18nRouter = useI18nRouter();
  const pathname = usePathname();
  const messageApi = useMessage();
  const user = useAuthStore((s) => s.user);
  const isStaff = normalizeRole(user?.role) === STAFF_ROLE;

  const avatarSrc = resolvePublicImageUrl(user?.avatar);
  const initials = `${user?.first_name?.charAt(0) || ""}${
    user?.last_name?.charAt(0) || ""
  }`.trim();
  const displayName = user?.username || t("defaultUser");
  const displayEmail = user?.email || "-";
  const displayLastName = (user?.last_name || displayName).toLocaleUpperCase(
    locale,
  );

  const logOutMutation = useMutation({
    mutationFn: async () => {
      await clearFCMToken();
      return logOut();
    },
    onSuccess: (res) => {
      messageApi.fromApi(res.data, "success");
      clearClientAuthData();
      router.push("/login");
    },
    onError: (error) => {
      messageApi.errorFromApi(error);
    },
  });

  const handleLogout = () => {
    if (logOutMutation.isPending) return;
    logOutMutation.mutate();
  };

  const handleLocaleChange = (newLocale: string) => {
    Cookies.set(NEXT_LOCALE_COOKIE, newLocale, { expires: 365, path: "/" });
    i18nRouter.replace(pathname, { locale: newLocale });
  };

  return (
    <header className="relative z-10 flex h-16 items-center justify-between border-b border-gray-400 bg-white px-4 sm:px-6">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:text-black lg:hidden"
          aria-label="Open sidebar menu"
        >
          <IoMenuOutline className="h-5 w-5" />
        </button>
        <h1 className="hidden text-[#000000] text-base md:block">
          <span className="font-medium">{t("greeting")},</span>{" "}
          <span className="font-bold">{displayLastName}</span>
        </h1>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-6">
        <NotificationDropdown isStaff={isStaff} />

        <div className="flex items-center space-x-2 sm:space-x-5">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => router.push("/profile")}
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 overflow-hidden border border-gray-400">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt="avatar"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : initials ? (
                <span className="text-xs font-semibold text-gray-600">
                  {initials}
                </span>
              ) : (
                <FiUser className="w-5 h-5" />
              )}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-bold text-black">{displayName}</p>
              <p className="text-xs text-gray-500">{displayEmail}</p>
            </div>
          </div>
          <ActionDropdown
            onLocaleChange={handleLocaleChange}
            onLogout={handleLogout}
            logoutPending={logOutMutation.isPending}
          />
        </div>
      </div>
    </header>
  );
}
