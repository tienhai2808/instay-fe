import type { AxiosError } from "axios";
import type { Faro, MetaSession, MetaUser } from "@grafana/faro-web-sdk";
import type { Tenant } from "@/types/data/tenant";
import type { User } from "@/types/data/user";

let faroInstance: Faro | null = null;

const toNonEmptyString = (value: unknown) => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
};

const toStringRecord = (entries: Array<[string, unknown]>) => {
  const record: Record<string, string> = {};

  for (const [key, value] of entries) {
    const normalized = toNonEmptyString(value);
    if (normalized) {
      record[key] = normalized;
    }
  }

  return record;
};

const resolveUserFullName = (user: User | null) => {
  const firstName = toNonEmptyString(user?.first_name);
  const lastName = toNonEmptyString(user?.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || undefined;
};

const getFaro = () => faroInstance;

const getRequestIdHeader = (error: AxiosError) => {
  const requestId = error.response?.headers?.["x-request-id"];
  if (Array.isArray(requestId)) {
    return requestId[0];
  }

  return requestId;
};

export const ensureFaro = (factory: () => Faro) => {
  if (!faroInstance) {
    faroInstance = factory();
  }

  return faroInstance;
};

export const syncFaroIdentity = ({
  isAuthenticated,
  tenant,
  user,
}: {
  isAuthenticated: boolean | null;
  tenant: Tenant | null;
  user: User | null;
}) => {
  const faro = getFaro();
  if (!faro) return;

  if (isAuthenticated && user) {
    const nextUser: MetaUser = {
      id: toNonEmptyString(user.id),
      username: toNonEmptyString(user.username),
      email: toNonEmptyString(user.email),
      fullName: resolveUserFullName(user),
      roles: toNonEmptyString(user.role),
      attributes: toStringRecord([
        ["department_id", user.department?.id],
        ["department_name", user.department?.name],
        ["tenant_name", tenant?.name],
        ["tenant_city", tenant?.city],
      ]),
    };

    faro.api.setUser(nextUser);
  } else {
    faro.api.resetUser();
  }

  const currentSession = faro.api.getSession();
  const nextAttributes = toStringRecord([
    ["auth_state", isAuthenticated ? "authenticated" : "anonymous"],
    ["tenant_name", tenant?.name],
    ["tenant_city", tenant?.city],
    ["tenant_phone", tenant?.phone],
    ["user_role", user?.role],
  ]);

  const nextSession: MetaSession = {
    ...(currentSession ?? {}),
    attributes: {
      ...(currentSession?.attributes ?? {}),
      ...nextAttributes,
    },
  };

  faro.api.setSession(nextSession);
};

export const reportAxiosErrorToFaro = (error: AxiosError) => {
  const faro = getFaro();
  if (!faro) return;

  const responseCode =
    (error.response?.data as { code?: unknown } | undefined)?.code ??
    (error.response?.data as { data?: { code?: unknown } } | undefined)?.data
      ?.code;

  const context = toStringRecord([
    ["kind", "axios"],
    ["code", error.code],
    ["method", error.config?.method?.toUpperCase()],
    ["url", error.config?.url],
    ["base_url", error.config?.baseURL],
    ["status", error.response?.status],
    ["api_code", responseCode],
    ["request_id", getRequestIdHeader(error)],
  ]);

  faro.api.pushError(error, {
    type: "http",
    context,
    originalError: error,
    stackFrames: [],
    fatal: false,
  });
};
