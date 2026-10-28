import { headers } from "next/headers";

type ApiCodePayload = {
  code?: unknown;
  data?: {
    code?: unknown;
  };
};

type ResolveApiNotFoundOptions = {
  path: string;
  notFoundCodes?: number[];
};

export const isValidNumericEntityId = (value: string) => {
  return /^[1-9]\d*$/.test(value.trim());
};

const normalizeApiCode = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const resolveApiCode = (payload: unknown): number | undefined => {
  if (!payload || typeof payload !== "object") return undefined;

  const typedPayload = payload as ApiCodePayload;
  const directCode = normalizeApiCode(typedPayload.code);
  if (directCode != null) return directCode;

  return normalizeApiCode(typedPayload.data?.code);
};

const buildApiUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!baseUrl) return null;

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
};

export const resolveApiNotFound = async ({
  path,
  notFoundCodes = [],
}: ResolveApiNotFoundOptions): Promise<boolean> => {
  const apiUrl = buildApiUrl(path);
  if (!apiUrl) return false;

  try {
    const headerStore = await headers();
    const cookieHeader = headerStore.get("cookie");

    const response = await fetch(apiUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    });

    if (response.status === 404) return true;

    const payload = await parseJsonSafely(response);
    const apiCode = resolveApiCode(payload);
    if (apiCode != null && notFoundCodes.includes(apiCode)) return true;

    return false;
  } catch {
    return false;
  }
};
