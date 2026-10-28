"use client";

import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  Messaging,
  onMessage,
  type MessagePayload,
} from "firebase/messaging";
import { deleteDeviceToken, upsertDeviceToken } from "@/apis/device-token";
import {
  getFirebaseConfig,
  getFirebaseMessagingSwUrl,
  getFirebaseVapidKey,
  hasRequiredFirebaseEnv,
} from "@/config/firebase";
import {
  LOCAL_STORAGE_FCM_TOKEN_KEY,
  LOCAL_STORAGE_FCM_SCOPE_KEY,
  TOKEN_REVALIDATE_INTERVAL_MS,
} from "@/constants/fcm";

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;
let fcmSupportedPromise: Promise<boolean> | null = null;
let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;
let syncPromise: Promise<void> | null = null;
let watcherCleanup: (() => void) | null = null;
let foregroundUnsubscribe: (() => void) | null = null;
let currentSyncScope = "";
const foregroundSubscribers = new Map<
  number,
  (payload: MessagePayload) => void
>();
let nextForegroundSubscriberId = 1;
const fcmTokenRefreshSubscribers = new Map<number, () => void>();
let nextFcmTokenRefreshSubscriberId = 1;

const isBrowser = () => typeof window !== "undefined";

const readStoredToken = () => {
  if (!isBrowser()) return "";
  return localStorage.getItem(LOCAL_STORAGE_FCM_TOKEN_KEY) ?? "";
};

const readStoredScope = () => {
  if (!isBrowser()) return "";
  return localStorage.getItem(LOCAL_STORAGE_FCM_SCOPE_KEY) ?? "";
};

const writeStoredToken = (token: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(LOCAL_STORAGE_FCM_TOKEN_KEY, token);
};

const writeStoredScope = (scope: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(LOCAL_STORAGE_FCM_SCOPE_KEY, scope);
};

const clearStoredToken = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(LOCAL_STORAGE_FCM_TOKEN_KEY);
};

const clearStoredScope = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(LOCAL_STORAGE_FCM_SCOPE_KEY);
};

export const setFcmSyncScope = (scope: string) => {
  currentSyncScope = scope;
};

const getFirebaseApp = () => {
  if (!appInstance) {
    appInstance = initializeApp(getFirebaseConfig());
  }
  return appInstance;
};

const getFirebaseMessaging = () => {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseApp());
  }
  return messagingInstance;
};

const getMessagingServiceWorkerRegistration = async () => {
  if (swRegistrationPromise) return swRegistrationPromise;

  const swUrl = getFirebaseMessagingSwUrl();
  swRegistrationPromise = navigator.serviceWorker.register(swUrl, {
    scope: "/",
  });

  return swRegistrationPromise;
};

export const isFcmSupported = async () => {
  if (!isBrowser()) return false;
  if (!hasRequiredFirebaseEnv()) return false;
  if (!("serviceWorker" in navigator)) return false;
  if (typeof Notification === "undefined") return false;

  if (!fcmSupportedPromise) {
    fcmSupportedPromise = isSupported().catch(() => false);
  }

  return fcmSupportedPromise;
};

export const requestPermission = async () => {
  if (!isBrowser()) return "denied" as NotificationPermission;
  if (typeof Notification === "undefined")
    return "denied" as NotificationPermission;
  if (Notification.permission === "granted")
    return "granted" as NotificationPermission;
  if (Notification.permission === "denied")
    return "denied" as NotificationPermission;
  return Notification.requestPermission();
};

const fetchFcmToken = async () => {
  const vapidKey = getFirebaseVapidKey();
  if (!vapidKey) return "";

  const registration = await getMessagingServiceWorkerRegistration();
  const messaging = getFirebaseMessaging();

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return token ?? "";
};

interface SyncTokenOptions {
  requestPermissionIfNeeded: boolean;
  scope?: string;
}

const syncFCMTokenInternal = async ({
  requestPermissionIfNeeded,
  scope,
}: SyncTokenOptions) => {
  const supported = await isFcmSupported();
  if (!supported) return;

  if (Notification.permission !== "granted" && requestPermissionIfNeeded) {
    const permission = await requestPermission();
    if (permission !== "granted") return;
  }

  if (Notification.permission !== "granted") return;

  const token = await fetchFcmToken();
  if (!token) return;

  const currentToken = readStoredToken();
  const currentScope = readStoredScope();
  const desiredScope = scope ?? currentSyncScope;
  if (currentToken === token && currentScope === desiredScope) return;

  await upsertDeviceToken(token);
  writeStoredToken(token);
  writeStoredScope(desiredScope);
  emitFcmTokenRefreshed();
};

export const syncFCMToken = async (
  options: SyncTokenOptions = { requestPermissionIfNeeded: false },
) => {
  if (syncPromise) return syncPromise;

  syncPromise = syncFCMTokenInternal(options).finally(() => {
    syncPromise = null;
  });

  return syncPromise;
};

export const initFCM = async () => {
  return syncFCMToken({ requestPermissionIfNeeded: true });
};

export const clearFCMToken = async () => {
  const token = readStoredToken();
  if (!token) {
    clearStoredScope();
    return;
  }

  try {
    await deleteDeviceToken(token);
  } finally {
    clearStoredToken();
    clearStoredScope();
  }
};

export const stopFCMTokenWatcher = () => {
  watcherCleanup?.();
  watcherCleanup = null;
};

const stopForegroundListener = () => {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;
};

const emitForegroundMessage = (payload: MessagePayload) => {
  for (const subscriber of foregroundSubscribers.values()) {
    try {
      subscriber(payload);
    } catch {
      continue;
    }
  }
};

const emitFcmTokenRefreshed = () => {
  for (const subscriber of fcmTokenRefreshSubscribers.values()) {
    try {
      subscriber();
    } catch {
      continue;
    }
  }
};

const ensureForegroundListener = async () => {
  if (!isBrowser()) return;
  if (foregroundUnsubscribe) return;

  const supported = await isFcmSupported();
  if (!supported) return;

  const messaging = getFirebaseMessaging();
  foregroundUnsubscribe = onMessage(messaging, (payload) => {
    emitForegroundMessage(payload);
  });
};

export const subscribeForegroundFcm = (
  callback: (payload: MessagePayload) => void,
) => {
  if (!isBrowser()) return () => undefined;

  const subscriberId = nextForegroundSubscriberId++;
  foregroundSubscribers.set(subscriberId, callback);
  void ensureForegroundListener();

  return () => {
    foregroundSubscribers.delete(subscriberId);
    if (foregroundSubscribers.size === 0) {
      stopForegroundListener();
    }
  };
};

export const subscribeFcmTokenRefresh = (callback: () => void) => {
  if (!isBrowser()) return () => undefined;

  const subscriberId = nextFcmTokenRefreshSubscriberId++;
  fcmTokenRefreshSubscribers.set(subscriberId, callback);

  return () => {
    fcmTokenRefreshSubscribers.delete(subscriberId);
  };
};

export const startFCMTokenWatcher = () => {
  if (!isBrowser()) return () => undefined;

  if (watcherCleanup) return watcherCleanup;

  const triggerSync = () => {
    void syncFCMToken({ requestPermissionIfNeeded: false });
  };

  const onFocus = () => triggerSync();
  const onOnline = () => triggerSync();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      triggerSync();
    }
  };

  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisibilityChange);
  const intervalId = window.setInterval(
    triggerSync,
    TOKEN_REVALIDATE_INTERVAL_MS,
  );

  triggerSync();

  watcherCleanup = () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.clearInterval(intervalId);
  };

  return watcherCleanup;
};

export const stopForegroundFcmWatcher = () => {
  foregroundSubscribers.clear();
  stopForegroundListener();
};
