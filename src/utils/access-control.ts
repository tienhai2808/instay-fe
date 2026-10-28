import {
  AUTHENTICATED_ALWAYS_ALLOWED_ROUTE_PREFIXES,
  DEPARTMENT_PERMISSION,
  PUBLIC_ROUTE_PREFIXES,
  ROLE_ADMIN,
  ROLE_STAFF,
  STAFF_ROUTE_PERMISSION_ORDER,
} from "@/constants/access-control";
import type { User } from "@/types/data/user";

export interface AuthzSnapshot {
  role: string;
  permissions: string[];
}

type UnknownRecord = Record<string, unknown>;

const normalizeText = (value: unknown) => {
  return typeof value === "string" ? value.trim() : "";
};

export const normalizeRole = (value: unknown) => {
  return normalizeText(value).toLowerCase();
};

const normalizePermission = (value: unknown) => {
  return normalizeText(value).toLowerCase();
};

const normalizePathname = (pathname: string) => {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;

  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
};

const isPathMatched = (pathname: string, routePrefix: string) => {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedRoutePrefix = normalizePathname(routePrefix);

  return (
    normalizedPathname === normalizedRoutePrefix ||
    normalizedPathname.startsWith(`${normalizedRoutePrefix}/`)
  );
};

const isMatchedByPrefixes = (pathname: string, prefixes: readonly string[]) => {
  return prefixes.some((prefix) => isPathMatched(pathname, prefix));
};

const collectPermissionNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return normalizePermission(item);
      if (!item || typeof item !== "object") return "";

      const name = (item as { name?: unknown }).name;
      return normalizePermission(name);
    })
    .filter(Boolean);
};

export const getUserPermissionNames = (user?: User | null) => {
  if (!user) return [];

  const userRecord = user as unknown as UnknownRecord;
  const departmentRecord =
    user.department && typeof user.department === "object"
      ? (user.department as unknown as UnknownRecord)
      : null;

  const mergedPermissions = [
    ...collectPermissionNames(departmentRecord?.permissions),
    ...collectPermissionNames(userRecord.permissions),
  ];

  return [...new Set(mergedPermissions)];
};

export const createAuthzSnapshot = (user?: User | null): AuthzSnapshot => {
  return {
    role: normalizeRole(user?.role),
    permissions: getUserPermissionNames(user),
  };
};

export const serializeAuthzSnapshot = (snapshot: AuthzSnapshot) => {
  const payload = JSON.stringify({
    role: normalizeRole(snapshot.role),
    permissions: [...new Set(snapshot.permissions.map(normalizePermission))],
  });

  return encodeURIComponent(payload);
};

const sanitizeAuthzSnapshot = (value: unknown): AuthzSnapshot | null => {
  if (!value || typeof value !== "object") return null;

  const record = value as {
    role?: unknown;
    permissions?: unknown;
  };

  const role = normalizeRole(record.role);
  const permissions = collectPermissionNames(record.permissions);

  if (!role && permissions.length === 0) return null;

  return {
    role,
    permissions: [...new Set(permissions)],
  };
};

export const deserializeAuthzSnapshot = (
  rawValue?: string | null,
): AuthzSnapshot | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return sanitizeAuthzSnapshot(parsed);
  } catch {
    return null;
  }
};

export const isAdminSnapshot = (snapshot?: AuthzSnapshot | null) => {
  return snapshot?.role === ROLE_ADMIN;
};

export const isStaffSnapshot = (snapshot?: AuthzSnapshot | null) => {
  return snapshot?.role === ROLE_STAFF;
};

export const hasPermission = (
  snapshot: AuthzSnapshot | null | undefined,
  permission: string,
) => {
  if (!snapshot) return false;
  if (isAdminSnapshot(snapshot)) return true;

  const normalizedPermission = normalizePermission(permission);
  return snapshot.permissions.includes(normalizedPermission);
};

const getStaffDefaultRoute = (snapshot: AuthzSnapshot) => {
  const matchedRoute = STAFF_ROUTE_PERMISSION_ORDER.find(({ permission }) =>
    hasPermission(snapshot, permission),
  );

  return matchedRoute?.routePrefix || "/profile";
};

export const getDefaultRouteForSnapshot = (
  snapshot: AuthzSnapshot | null | undefined,
) => {
  if (!snapshot) return "/login";
  if (isAdminSnapshot(snapshot)) return "/dashboard";
  if (isStaffSnapshot(snapshot)) return getStaffDefaultRoute(snapshot);
  return "/profile";
};

export const canAccessPathWithSnapshot = (
  pathname: string,
  snapshot: AuthzSnapshot | null | undefined,
) => {
  if (!snapshot) return false;
  if (isAdminSnapshot(snapshot)) return true;
  if (!isStaffSnapshot(snapshot)) return false;

  if (
    isMatchedByPrefixes(pathname, AUTHENTICATED_ALWAYS_ALLOWED_ROUTE_PREFIXES)
  )
    return true;

  const matchedRule = STAFF_ROUTE_PERMISSION_ORDER.find(({ routePrefix }) =>
    isPathMatched(pathname, routePrefix),
  );
  return matchedRule ? hasPermission(snapshot, matchedRule.permission) : false;
};

export const isPublicPath = (pathname: string) => {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) =>
    isPathMatched(pathname, prefix),
  );
};

export const canManageBooking = (snapshot: AuthzSnapshot | null | undefined) =>
  hasPermission(snapshot, DEPARTMENT_PERMISSION.BOOKING_MANAGEMENT);

export const canManageGuests = (snapshot: AuthzSnapshot | null | undefined) =>
  hasPermission(snapshot, DEPARTMENT_PERMISSION.GUEST_MANAGEMENT);

export const canManageOrderServices = (
  snapshot: AuthzSnapshot | null | undefined,
) => hasPermission(snapshot, DEPARTMENT_PERMISSION.ORDER_SERVICE_MANAGEMENT);

export const canManageSupportTickets = (
  snapshot: AuthzSnapshot | null | undefined,
) => hasPermission(snapshot, DEPARTMENT_PERMISSION.SUPPORT_TICKET_MANAGEMENT);
