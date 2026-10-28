importScripts(
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js",
);

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
};

const hasConfig = Object.values(firebaseConfig).every(Boolean);

const normalizeText = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const parseJsonObject = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const resolveDetailPath = (meta) => {
  const contentType = normalizeText(meta?.content_type).toLowerCase();
  const contentId = normalizeText(meta?.content_id);

  if (!contentId) return "";

  if (contentType === "order_service") {
    return `/order-services/${contentId}`;
  }

  if (contentType === "booking") {
    return `/bookings/${contentId}`;
  }

  return "";
};

if (hasConfig) {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const notification = payload?.notification ?? {};
    const data = payload?.data ?? {};
    const notificationBody = normalizeText(notification.body);
    const dataBody = normalizeText(data.body);
    const parsedBodyMeta =
      parseJsonObject(notificationBody) || parseJsonObject(dataBody);
    const mergedMeta = {
      ...(parsedBodyMeta || {}),
      ...data,
    };

    const title = notification.title || data.title || "New notification";
    const body =
      notificationBody && !parseJsonObject(notificationBody)
        ? notificationBody
        : dataBody && !parseJsonObject(dataBody)
          ? dataBody
          : "";
    const icon = notification.icon || data.icon || "/logo-instay.svg";
    const clickAction =
      resolveDetailPath(mergedMeta) || data.click_action || data.url || "/";

    self.registration.showNotification(title, {
      body,
      icon,
      data: { clickAction },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const clickAction = event.notification?.data?.clickAction || "/";
  event.waitUntil(clients.openWindow(clickAction));
});
