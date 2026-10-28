"use client";

import { getGuestUnreadNotificationsCount } from "@/apis/notification";
import Cookies from "js-cookie";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiSearch } from "react-icons/fi";
import {
  LOCALE_EN,
  LOCALE_VI,
  NEXT_LOCALE_COOKIE,
  type AppLocale,
} from "@/constants/locale";
import { Link, usePathname, useRouter as useI18nRouter } from "@/i18n/routing";
import { useTenantStore } from "@/stores/useTenantStore";
import { resolvePublicImageUrl } from "@/utils/media";
import { useQueryClient } from "@tanstack/react-query";
import { BsBell } from "react-icons/bs";
import NotificationPanel from "./NotificationPanel";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (nextValue: string) => void;
}

const localeMeta: Record<AppLocale, { flagCountryCode: "vn" | "gb" }> = {
  vi: { flagCountryCode: "vn" },
  en: { flagCountryCode: "gb" },
};

const resolveLocale = (value: string): AppLocale =>
  value === LOCALE_EN ? LOCALE_EN : LOCALE_VI;

export default function Header({ searchValue, onSearchChange }: HeaderProps) {
  const tHeader = useTranslations("HomePage.header");
  const tenant = useTenantStore((state) => state.tenant);
  const locale = resolveLocale(useLocale());
  const pathname = usePathname();
  const i18nRouter = useI18nRouter();
  const queryClient = useQueryClient();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);

  const currentLocaleMeta = localeMeta[locale];
  const nextLocale = locale === LOCALE_VI ? LOCALE_EN : LOCALE_VI;
  const switchLabel =
    nextLocale === LOCALE_EN
      ? tHeader("switchToEnglish")
      : tHeader("switchToVietnamese");

  const tenantName = tenant?.name?.trim() || tHeader("fallbackTenantName");
  const tenantPhone = tenant?.phone?.trim() || tHeader("fallbackTenantPhone");
  const tenantLogo = resolvePublicImageUrl(tenant?.logo);

  const handleLocaleSwitch = () => {
    Cookies.set(NEXT_LOCALE_COOKIE, nextLocale, { expires: 365, path: "/" });
    i18nRouter.replace(pathname, { locale: nextLocale });
  };

  const syncUnreadCount = useCallback(async () => {
    try {
      const res = await getGuestUnreadNotificationsCount();
      const count = res.data?.data?.count;
      setUnreadNotificationsCount(
        Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
      );
    } catch {
      // ignore sync failure to keep guest navigation smooth
    }
  }, [setUnreadNotificationsCount]);

  useEffect(() => {
    const initialSyncTimer = window.setTimeout(() => {
      void syncUnreadCount();
    }, 0);

    const intervalId = window.setInterval(() => {
      void syncUnreadCount();
    }, 15000);

    const handleFocus = () => {
      void syncUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      void syncUnreadCount();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialSyncTimer);
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncUnreadCount]);

  const handleOpenNotificationPanel = () => {
    void syncUnreadCount();
    setNotificationPanelOpen(true);
  };

  const handleCloseNotificationPanel = useCallback(() => {
    setNotificationPanelOpen(false);
    queryClient.removeQueries({ queryKey: ["guest", "notifications", "list"] });
    void syncUnreadCount();
  }, [queryClient, syncUnreadCount]);

  const safeUnreadCount = Math.max(0, unreadNotificationsCount || 0);
  const shouldShowUnreadBadge = safeUnreadCount > 0;

  return (
    <header className="bg-[#8b5cf6] px-4 py-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <Link
          href="/feedbacks"
          className="flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
          aria-label={tHeader("goToFeedbacks")}
        >
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
            {tenantLogo ? (
              <Image
                src={tenantLogo}
                alt="tenant-logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
                {tenantName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold leading-tight text-white">
              {tenantName}
            </h3>
            <p className="truncate text-xs font-medium text-white/80">
              {tenantPhone}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={tHeader("notifications")}
            onClick={handleOpenNotificationPanel}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#6d28d9] shadow-sm"
          >
            <BsBell className="h-5 w-5" />
            {shouldShowUnreadBadge ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#ef4444]" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={handleLocaleSwitch}
            aria-label={switchLabel}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#6d28d9] shadow-sm"
          >
            <Image
              src={`https://flagcdn.com/${currentLocaleMeta.flagCountryCode}.svg`}
              alt={switchLabel}
              width={10}
              height={10}
              className="h-5 w-5 object-cover overflow-hidden rounded-full"
              unoptimized
            />
          </button>
        </div>
      </div>

      <label className="relative block">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={tHeader("searchPlaceholder")}
          className="h-10 w-full rounded-xl border border-white/50 bg-white px-10 pr-4 text-sm text-[#111827] outline-none transition focus:border-[#6d28d9] focus:ring-2 focus:ring-[#6d28d9]/30"
        />
      </label>

      <NotificationPanel
        open={notificationPanelOpen}
        locale={locale}
        onClose={handleCloseNotificationPanel}
        onNavigate={(path) => {
          i18nRouter.push(path);
        }}
      />
    </header>
  );
}
