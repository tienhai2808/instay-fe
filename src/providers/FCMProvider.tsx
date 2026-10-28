"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessagePayload } from "firebase/messaging";
import { usePathname, useRouter } from "next/navigation";
import { getUnreadNotificationsCount } from "@/apis/notification";
import { useAuthStore } from "@/stores/useAuthStore";
import { IoClose } from "react-icons/io5";
import {
  clearFCMToken,
  isFcmSupported,
  initFCM,
  setFcmSyncScope,
  startFCMTokenWatcher,
  stopFCMTokenWatcher,
  stopForegroundFcmWatcher,
  subscribeFcmTokenRefresh,
  subscribeForegroundFcm,
} from "@/services/fcm";
import { resolveApiMessage } from "@/utils/api-response";
import { getCookie } from "@/utils/cookies";
import { useGuestStore } from "@/stores/useGuestStore";
import { NEXT_LOCALE_COOKIE, resolveLocale } from "@/constants/locale";

const STAFF_ROLE = "staff";
const ORDER_SERVICE_CONTENT_TYPE = "order_service";
const BOOKING_CONTENT_TYPE = "booking";
const SUPPORT_TICKET_CONTENT_TYPE = "support_ticket";
const EVENT_CONTENT_TYPE = "event";
const NOTIFICATION_AUTO_CLOSE_MS = 7000;
const ENABLE_PROMPT_DISMISS_KEY = "fcm-enable-prompt-dismiss-state";

type NotificationMeta = Record<string, unknown>;
type EnablePromptState =
  | "hidden"
  | "requestable"
  | "unsupported"
  | "ios-standalone-required"
  | "denied";

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  contentType: string;
  contentKey: string;
}

interface NotificationCopy {
  closeButton: string;
  viewNowButton: string;
  closeToastLabel: string;
  enablePushTitle: string;
  requestPermission: string;
  requestingPermission: string;
  dismissPromptButton: string;
  defaultPrompt: string;
  deniedPrompt: string;
  iosStandalonePrompt: string;
  unsupportedPrompt: string;
}

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeKey = (value: unknown) => normalizeText(value).toLowerCase();
const isBrowser = () => typeof window !== "undefined";

const isEnablePromptState = (value: unknown): value is EnablePromptState => {
  return (
    value === "hidden" ||
    value === "requestable" ||
    value === "unsupported" ||
    value === "ios-standalone-required" ||
    value === "denied"
  );
};

const readDismissedEnablePromptState = (): EnablePromptState => {
  if (!isBrowser()) return "hidden";

  const stored = window.localStorage.getItem(ENABLE_PROMPT_DISMISS_KEY);
  if (!isEnablePromptState(stored)) return "hidden";
  return stored;
};

const writeDismissedEnablePromptState = (state: EnablePromptState) => {
  if (!isBrowser()) return;

  if (state === "hidden") {
    window.localStorage.removeItem(ENABLE_PROMPT_DISMISS_KEY);
    return;
  }

  window.localStorage.setItem(ENABLE_PROMPT_DISMISS_KEY, state);
};

const parseJsonObject = (value: unknown): NotificationMeta | null => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed as NotificationMeta;
  } catch {
    return null;
  }
};

const normalizeCode = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return undefined;
};

const resolveContentKey = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
};

const resolveNotificationMeta = (payload: MessagePayload): NotificationMeta => {
  const dataMeta = (payload.data ?? {}) as NotificationMeta;
  const notificationBody = normalizeText(payload.notification?.body);
  const bodyFromData = normalizeText(dataMeta.body);

  const parsedBody =
    parseJsonObject(notificationBody) ?? parseJsonObject(bodyFromData);

  return {
    ...(parsedBody ?? {}),
    ...dataMeta,
  };
};

const resolveNotificationTitle = (
  payload: MessagePayload,
  meta: NotificationMeta,
) => {
  const code = normalizeCode(meta.code);
  if (code != null) {
    const mappedTitle = resolveApiMessage({ code });
    if (mappedTitle) return mappedTitle;
  }

  return (
    normalizeText(payload.notification?.title) ||
    normalizeText(meta.title) ||
    "Notification"
  );
};

const resolveNotificationBody = (
  payload: MessagePayload,
  meta: NotificationMeta,
) => {
  const notificationBody = normalizeText(payload.notification?.body);
  if (notificationBody && !parseJsonObject(notificationBody)) {
    return notificationBody;
  }

  const dataBody = normalizeText(meta.body);
  if (dataBody && !parseJsonObject(dataBody)) {
    return dataBody;
  }

  return "";
};

const resolveNotificationPayload = (
  payload: MessagePayload,
): InAppNotification => {
  const meta = resolveNotificationMeta(payload);

  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    title: resolveNotificationTitle(payload, meta),
    body: resolveNotificationBody(payload, meta),
    contentType: normalizeKey(meta.content_type),
    contentKey: resolveContentKey(meta.content_key ?? meta.content_id),
  };
};

const resolveStaffPath = (contentType: string, contentKey: string) => {
  if (contentType === ORDER_SERVICE_CONTENT_TYPE) {
    return contentKey ? `/order-services/${contentKey}` : "";
  }

  if (contentType === BOOKING_CONTENT_TYPE) {
    return contentKey ? `/bookings/${contentKey}` : "";
  }

  if (contentType === SUPPORT_TICKET_CONTENT_TYPE) {
    return "/support-tickets";
  }

  return "";
};

const resolveGuestPath = (contentType: string, contentKey: string) => {
  if (contentType === ORDER_SERVICE_CONTENT_TYPE) {
    return "/orders";
  }

  if (contentType === SUPPORT_TICKET_CONTENT_TYPE) {
    return "/requests";
  }

  if (contentType === EVENT_CONTENT_TYPE) {
    return contentKey ? `/news/${contentKey}` : "/news";
  }

  return "";
};

const resolveNotificationOpenPath = (
  notification: InAppNotification | null,
  isStaffUser: boolean,
) => {
  if (!notification) return "";

  if (isStaffUser) {
    return resolveStaffPath(notification.contentType, notification.contentKey);
  }

  return resolveGuestPath(notification.contentType, notification.contentKey);
};

const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "default";
  }

  return Notification.permission;
};

const isIOSDevice = () => {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isIPadOSDesktop =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  return isIOS || isIPadOSDesktop;
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
};

const resolveCopy = (locale: string): NotificationCopy => {
  if (locale === "en") {
    return {
      closeButton: "Close",
      viewNowButton: "View now",
      closeToastLabel: "Close toast",
      enablePushTitle: "Enable notifications",
      requestPermission: "Enable notifications",
      requestingPermission: "Requesting...",
      dismissPromptButton: "Dismiss",
      defaultPrompt: "Turn on push notifications to receive real-time updates.",
      deniedPrompt: "Open browser settings to allow notifications.",
      iosStandalonePrompt:
        "On iPhone/iPad, add this app to Home Screen first, then enable notifications.",
      unsupportedPrompt:
        "This browser does not support web push notifications.",
    };
  }

  return {
    closeButton: "Đóng",
    viewNowButton: "Xem ngay",
    closeToastLabel: "Đóng thông báo",
    enablePushTitle: "Bật thông báo",
    requestPermission: "Bật thông báo",
    requestingPermission: "Đang xin quyền...",
    dismissPromptButton: "Tắt",
    defaultPrompt:
      "Bật push notification để nhận cập nhật theo thời gian thực.",
    deniedPrompt: "Mở cài đặt trình duyệt để cấp quyền thông báo.",
    iosStandalonePrompt:
      "Trên iPhone/iPad, hãy Add to Home Screen trước rồi mới bật thông báo.",
    unsupportedPrompt: "Trình duyệt này chưa hỗ trợ web push notification.",
  };
};

export default function FCMProvider() {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setUnreadNotificationsCount = useAuthStore(
    (state) => state.setUnreadNotificationsCount,
  );
  const incrementUnreadNotificationsCount = useAuthStore(
    (state) => state.incrementUnreadNotificationsCount,
  );
  const decrementUnreadNotificationsCount = useAuthStore(
    (state) => state.decrementUnreadNotificationsCount,
  );

  const hasGuestSession = useGuestStore((state) => state.isGuestAuthenticated);

  const [notification, setNotification] = useState<InAppNotification | null>(
    null,
  );
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    () => getNotificationPermission(),
  );
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [dismissedPromptState, setDismissedPromptState] =
    useState<EnablePromptState>(() => readDismissedEnablePromptState());

  const closeTimerRef = useRef<number | null>(null);

  const isIOS = useMemo(() => isIOSDevice(), []);
  const normalizedRole = useMemo(() => normalizeKey(user?.role), [user?.role]);
  const locale = resolveLocale(getCookie(NEXT_LOCALE_COOKIE));
  const copy = useMemo(() => resolveCopy(locale), [locale]);

  const isAuthenticatedUser = isAuthenticated === true;
  const isStaffUser = isAuthenticatedUser && normalizedRole === STAFF_ROLE;
  const isKnownNonStaffUser =
    isAuthenticatedUser &&
    !hasGuestSession &&
    Boolean(normalizedRole) &&
    !isStaffUser;
  const shouldWaitForRole =
    isAuthenticatedUser && !hasGuestSession && !normalizedRole;
  const shouldEnableFCM = hasGuestSession || isStaffUser;

  const notificationOpenPath = useMemo(
    () => resolveNotificationOpenPath(notification, isStaffUser),
    [notification, isStaffUser],
  );
  const canOpenDetail = Boolean(notificationOpenPath);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeNotification = useCallback(() => {
    clearCloseTimer();
    setNotification(null);
  }, [clearCloseTimer]);

  const scheduleCloseNotification = useCallback(
    (delayMs = NOTIFICATION_AUTO_CLOSE_MS) => {
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setNotification(null);
        closeTimerRef.current = null;
      }, delayMs);
    },
    [clearCloseTimer],
  );

  const syncUnreadCount = useCallback(async () => {
    if (!isAuthenticatedUser || !isStaffUser) return;

    try {
      const res = await getUnreadNotificationsCount();
      setUnreadNotificationsCount(res.data?.data?.count);
    } catch {
      // Ignore count sync errors to avoid interrupting notification UX.
    }
  }, [isAuthenticatedUser, isStaffUser, setUnreadNotificationsCount]);

  const openNotificationDetail = useCallback(() => {
    if (!notification) return;

    if (notificationOpenPath) {
      if (isStaffUser) {
        decrementUnreadNotificationsCount();
      }
      router.push(notificationOpenPath);
    }

    closeNotification();
  }, [
    closeNotification,
    decrementUnreadNotificationsCount,
    isStaffUser,
    notification,
    notificationOpenPath,
    router,
  ]);

  const handleForegroundMessage = useCallback(
    (payload: MessagePayload) => {
      if (isKnownNonStaffUser) return;

      const nextNotification = resolveNotificationPayload(payload);

      if (isStaffUser) {
        incrementUnreadNotificationsCount();
      }

      setNotification(nextNotification);
      scheduleCloseNotification();
    },
    [
      incrementUnreadNotificationsCount,
      isKnownNonStaffUser,
      isStaffUser,
      scheduleCloseNotification,
    ],
  );

  const enablePushNotifications = useCallback(async () => {
    if (isEnablingPush || !shouldEnableFCM || pushSupported !== true) return;

    setIsEnablingPush(true);
    try {
      setFcmSyncScope(isStaffUser ? "staff" : "guest");
      await initFCM();

      const permission = getNotificationPermission();
      setPushPermission(permission);

      if (permission === "granted" && isStaffUser) {
        await syncUnreadCount();
      }
    } finally {
      setIsEnablingPush(false);
    }
  }, [
    isEnablingPush,
    isStaffUser,
    pushSupported,
    shouldEnableFCM,
    syncUnreadCount,
  ]);

  useEffect(() => {
    const syncLocalState = () => {
      setPushPermission(getNotificationPermission());
      setIsStandalone(isStandaloneMode());
    };

    let isMounted = true;

    syncLocalState();
    void (async () => {
      const supported = await isFcmSupported();
      if (!isMounted) return;
      setPushSupported(supported);
    })();

    const onFocus = () => syncLocalState();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncLocalState();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === null && !hasGuestSession) return;
    if (shouldWaitForRole) return;

    if (shouldEnableFCM && pushPermission === "granted") {
      setFcmSyncScope(isStaffUser ? "staff" : "guest");

      if (isStaffUser) {
        void syncUnreadCount();
      }

      void initFCM();
      const stopTokenWatcher = startFCMTokenWatcher();
      const unsubscribeForeground = subscribeForegroundFcm(
        handleForegroundMessage,
      );
      const unsubscribeTokenRefresh = subscribeFcmTokenRefresh(() => {
        if (!isStaffUser) return;
        void syncUnreadCount();
      });

      return () => {
        stopTokenWatcher();
        unsubscribeForeground();
        unsubscribeTokenRefresh();
      };
    }

    setFcmSyncScope("");
    stopFCMTokenWatcher();
    stopForegroundFcmWatcher();
    scheduleCloseNotification(0);

    if (!shouldEnableFCM || pushPermission === "denied") {
      void clearFCMToken();
    }
  }, [
    handleForegroundMessage,
    hasGuestSession,
    isAuthenticated,
    isStaffUser,
    pushPermission,
    scheduleCloseNotification,
    shouldEnableFCM,
    shouldWaitForRole,
    syncUnreadCount,
  ]);

  useEffect(() => {
    scheduleCloseNotification(0);
  }, [pathname, scheduleCloseNotification]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const shouldShowEnablePrompt =
    shouldEnableFCM && !shouldWaitForRole && pushPermission !== "granted";
  const requiresIOSStandalone = isIOS && !isStandalone;
  let enablePromptState: EnablePromptState = "hidden";
  if (shouldShowEnablePrompt) {
    if (pushSupported === false) {
      enablePromptState = "unsupported";
    } else if (requiresIOSStandalone) {
      enablePromptState = "ios-standalone-required";
    } else if (pushPermission === "denied") {
      enablePromptState = "denied";
    } else {
      enablePromptState = "requestable";
    }
  }

  const isEnablePromptVisible = dismissedPromptState !== enablePromptState;
  const canRequestPermission = enablePromptState === "requestable";

  let promptDescription = copy.defaultPrompt;
  if (enablePromptState === "unsupported") {
    promptDescription = copy.unsupportedPrompt;
  } else if (enablePromptState === "ios-standalone-required") {
    promptDescription = copy.iosStandalonePrompt;
  } else if (enablePromptState === "denied") {
    promptDescription = copy.deniedPrompt;
  }

  const dismissEnablePrompt = useCallback(() => {
    if (enablePromptState === "hidden") return;
    setDismissedPromptState(enablePromptState);
    writeDismissedEnablePromptState(enablePromptState);
  }, [enablePromptState]);

  if (!notification && !isEnablePromptVisible) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] w-[calc(100vw-24px)] max-w-[430px] space-y-3 sm:right-5 sm:top-5">
      {isEnablePromptVisible && enablePromptState !== "hidden" ? (
        <div className="pointer-events-auto rounded-md bg-white p-4 shadow-xl ring-1 ring-[#111827]/15">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[#0F172A]">
              {copy.enablePushTitle}
            </p>
            <button
              type="button"
              onClick={dismissEnablePrompt}
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-[#475569] transition hover:bg-[#F1F5F9]"
            >
              {copy.dismissPromptButton}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#334155]">{promptDescription}</p>

          {canRequestPermission ? (
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  void enablePushNotifications();
                }}
                disabled={isEnablingPush}
                className="cursor-pointer rounded-lg bg-[#0A0A0A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEnablingPush
                  ? copy.requestingPermission
                  : copy.requestPermission}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {notification ? (
        <div
          role={canOpenDetail ? "button" : undefined}
          tabIndex={canOpenDetail ? 0 : undefined}
          onClick={canOpenDetail ? openNotificationDetail : undefined}
          onKeyDown={
            canOpenDetail
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openNotificationDetail();
                  }
                }
              : undefined
          }
          className={[
            "pointer-events-auto rounded-md shadow-xl",
            canOpenDetail ? "cursor-pointer" : "",
            isStaffUser
              ? "relative overflow-hidden bg-white p-5 ring-1 ring-[#111827]/15"
              : "relative border-1 border-[#8b5cf6] bg-white p-4 pr-10",
          ].join(" ")}
        >
          {isStaffUser ? (
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1.5 bg-[#0A0A0A]"
            />
          ) : null}

          {!isStaffUser ? (
            <button
              type="button"
              aria-label={copy.closeToastLabel}
              onClick={(event) => {
                event.stopPropagation();
                closeNotification();
              }}
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <IoClose className="h-4 w-4" />
            </button>
          ) : null}

          <p
            className={[
              "font-semibold text-[#0F172A]",
              isStaffUser ? "text-base" : "text-sm",
            ].join(" ")}
          >
            {notification.title}
          </p>

          {notification.body ? (
            <p
              className={[
                "mt-1 text-[#334155]",
                isStaffUser ? "text-sm" : "text-xs",
              ].join(" ")}
            >
              {notification.body}
            </p>
          ) : null}

          {isStaffUser ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeNotification();
                }}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
              >
                {copy.closeButton}
              </button>

              {canOpenDetail ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openNotificationDetail();
                  }}
                  className="cursor-pointer rounded-lg bg-[#0A0A0A] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
                >
                  {copy.viewNowButton}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
