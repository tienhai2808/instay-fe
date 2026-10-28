import { SSE_DEFAULT_PATH } from "@/constants/sse";

const FALLBACK_ORIGIN = "http://localhost";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const parseBooleanEnv = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return true;

  if (["0", "false", "off", "no"].includes(normalized)) return false;
  if (["1", "true", "on", "yes"].includes(normalized)) return true;

  return true;
};

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

const resolveSseBase = () => {
  const explicit = process.env.NEXT_PUBLIC_SSE_URL?.trim();
  if (explicit) return explicit;

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiBase) return "";

  return `${trimTrailingSlash(apiBase)}${SSE_DEFAULT_PATH}`;
};

export const isSseEnabled = () => {
  return parseBooleanEnv(process.env.NEXT_PUBLIC_SSE_ENABLED);
};

export const getSseEndpoint = () => {
  if (!isSseEnabled()) return "";

  const base = resolveSseBase();
  if (!base) return "";

  const url = toUrl(base);
  if (!url) return "";

  return url.toString();
};
