import { WEBSOCKET_PATH } from "@/constants/websocket";

const FALLBACK_ORIGIN = "http://localhost";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const toUrl = (raw: string) => {
  if (!raw) return null;

  const base =
    typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN;

  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
};

const resolveWebSocketBase = () => {
  const explicit = process.env.NEXT_PUBLIC_WEBSOCKET_URL?.trim();
  if (explicit) return explicit;

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiBase) return WEBSOCKET_PATH;

  return `${trimTrailingSlash(apiBase)}${WEBSOCKET_PATH}`;
};

const normalizeToWebSocketProtocol = (url: URL) => {
  if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  return url;
};

export const getWebSocketEndpoint = () => {
  const base = resolveWebSocketBase();
  const url = toUrl(base);
  if (!url) return "";

  const normalized = normalizeToWebSocketProtocol(url);
  if (!["ws:", "wss:"].includes(normalized.protocol)) return "";

  return normalized.toString();
};
