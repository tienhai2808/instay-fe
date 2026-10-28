import {
  ANONYMOUS_ROUTE_PREFIXES,
  AUTH_ROUTE_PREFIXES,
  GUEST_ROUTE_PREFIXES,
  STAFF_ROUTE_PREFIXES,
} from "@/constants/route-domains";

export type RouteDomain = "staff" | "guest" | "auth" | "anonymous" | "unknown";

export const normalizePathname = (pathname: string) => {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;

  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
};

export const isPathMatched = (pathname: string, routePrefix: string) => {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedRoutePrefix = normalizePathname(routePrefix);

  return (
    normalizedPathname === normalizedRoutePrefix ||
    normalizedPathname.startsWith(`${normalizedRoutePrefix}/`)
  );
};

const isMatchedByPrefixes = (
  pathname: string,
  prefixes: readonly string[],
): boolean => {
  return prefixes.some((prefix) => isPathMatched(pathname, prefix));
};

export const resolveRouteDomain = (pathname: string): RouteDomain => {
  if (isMatchedByPrefixes(pathname, AUTH_ROUTE_PREFIXES)) {
    return "auth";
  }

  if (isMatchedByPrefixes(pathname, ANONYMOUS_ROUTE_PREFIXES)) {
    return "anonymous";
  }

  if (isMatchedByPrefixes(pathname, GUEST_ROUTE_PREFIXES)) {
    return "guest";
  }

  if (isMatchedByPrefixes(pathname, STAFF_ROUTE_PREFIXES)) {
    return "staff";
  }

  return "unknown";
};
