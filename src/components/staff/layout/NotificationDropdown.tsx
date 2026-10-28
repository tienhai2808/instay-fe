"use client";

import { useCallback, useEffect, useState } from "react";
import { RiNotification3Line } from "react-icons/ri";
import { Dropdown } from "antd";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { useAuthStore } from "@/stores/useAuthStore";
import { NotificationPanel } from "@/components/staff/layout/NotificationPanel";
import { useQueryClient } from "@tanstack/react-query";
import { getUnreadNotificationsCount } from "@/apis/notification";

interface NotificationDropdownProps {
  isStaff: boolean;
}

export function NotificationDropdown({ isStaff }: NotificationDropdownProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const unreadNotificationsCount = useAuthStore(
    (s) => s.unreadNotificationsCount,
  );
  const setUnreadNotificationsCount = useAuthStore(
    (s) => s.setUnreadNotificationsCount,
  );
  const [open, setOpen] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const syncUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationsCount();
      setUnreadNotificationsCount(res.data?.data?.count);
    } catch {
      // ignore sync failure to keep dropdown interaction smooth
    }
  }, [setUnreadNotificationsCount]);

  const handlePanelOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        setOpenedAtPath(pathname);
        return;
      }

      setOpenedAtPath(null);
      queryClient.removeQueries({ queryKey: ["notifications", "list"] });
      void syncUnreadCount();
    },
    [pathname, queryClient, syncUnreadCount],
  );

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  if (!isStaff) return null;

  const isPanelOpen = open && openedAtPath === pathname;
  const safeUnreadCount = Math.max(0, unreadNotificationsCount || 0);
  const shouldShowUnreadBadge = safeUnreadCount > 0;
  const unreadBadgeText =
    safeUnreadCount > 99 ? "99+" : String(safeUnreadCount);

  const triggerButton = (
    <button
      type="button"
      onClick={
        isMobileViewport
          ? () => {
              const nextOpen = !isPanelOpen;
              handlePanelOpenChange(nextOpen);
            }
          : undefined
      }
      className="relative cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-md text-[#6B7280] transition-colors hover:bg-gray-100 hover:text-black"
      aria-label="Notifications"
    >
      {shouldShowUnreadBadge ? (
        <span className="absolute -right-0.5 top-0.5 min-w-[18px] rounded-full bg-[#EF4444] px-1.5 py-[1px] text-center text-[10px] font-bold leading-[1.2] text-white">
          {unreadBadgeText}
        </span>
      ) : null}
      <RiNotification3Line className="h-5 w-5" />
    </button>
  );

  if (isMobileViewport) {
    return (
      <div className="relative flex items-center">
        {triggerButton}
        <NotificationPanel
          open={isPanelOpen}
          isMobile
          locale={locale}
          onClose={() => {
            handlePanelOpenChange(false);
          }}
          onNavigate={(path) => {
            router.push(path);
          }}
        />
      </div>
    );
  }

  return (
    <Dropdown
      menu={{ items: [] }}
      open={isPanelOpen}
      onOpenChange={handlePanelOpenChange}
      placement="bottomRight"
      arrow
      trigger={["click"]}
      popupRender={() => (
        <NotificationPanel
          open={isPanelOpen}
          isMobile={false}
          locale={locale}
          onClose={() => {
            handlePanelOpenChange(false);
          }}
          onNavigate={(path) => {
            router.push(path);
          }}
        />
      )}
    >
      {triggerButton}
    </Dropdown>
  );
}
