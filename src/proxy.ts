import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTHZ_COOKIE_KEY } from "@/constants/access-control";
import { GUEST_TOKEN } from "@/constants/token";
import {
  ANONYMOUS_DEFAULT_ROUTE,
  GUEST_DEFAULT_ROUTE,
} from "@/constants/route-domains";
import { NEXT_LOCALE_COOKIE, resolveLocale } from "@/constants/locale";
import createMiddleware from "next-intl/middleware";
import {
  canAccessPathWithSnapshot,
  deserializeAuthzSnapshot,
  getDefaultRouteForSnapshot,
} from "@/utils/access-control";
import { resolveRouteDomain } from "@/utils/route-domains";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const normalizePathname = (pathname: string) =>
  pathname.startsWith("/") ? pathname : `/${pathname}`;

const toLocaleInternalPathname = (request: NextRequest, pathname: string) => {
  const locale = resolveLocale(request.cookies.get(NEXT_LOCALE_COOKIE)?.value);
  const normalizedPathname = stripLocalePrefix(normalizePathname(pathname));

  return normalizedPathname === "/"
    ? `/${locale}`
    : `/${locale}${normalizedPathname}`;
};

const rewriteToLocalePathname = (request: NextRequest, pathname: string) => {
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = toLocaleInternalPathname(request, pathname);
  return NextResponse.rewrite(rewriteUrl);
};

const isRscRequest = (request: NextRequest) =>
  request.nextUrl.searchParams.has("_rsc") ||
  request.headers.get("rsc") === "1";

const redirect = (request: NextRequest, targetPath: string) =>
  isRscRequest(request)
    ? rewriteToLocalePathname(request, targetPath)
    : NextResponse.redirect(new URL(targetPath, request.url));

const withIntl = (request: NextRequest) => {
  return intlMiddleware(request);
};

const stripLocalePrefix = (pathname: string) => {
  const matchedLocale = routing.locales.find((locale) => {
    const prefix = `/${locale}`;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });

  if (!matchedLocale) return pathname;

  const localePrefix = `/${matchedLocale}`;
  if (pathname === localePrefix) return "/";

  const strippedPathname = pathname.slice(localePrefix.length);
  return strippedPathname.startsWith("/")
    ? strippedPathname
    : `/${strippedPathname}`;
};

export default function proxy(request: NextRequest) {
  const pathname = stripLocalePrefix(request.nextUrl.pathname);
  const rawAuthzSnapshot = request.cookies.get(AUTHZ_COOKIE_KEY)?.value ?? null;
  const authzSnapshot = deserializeAuthzSnapshot(rawAuthzSnapshot);
  const guestToken = request.cookies.get(GUEST_TOKEN)?.value ?? null;
  const isGuest = Boolean(guestToken);
  const isStaff = Boolean(authzSnapshot);
  const defaultStaffPath = authzSnapshot
    ? getDefaultRouteForSnapshot(authzSnapshot)
    : "/login";
  const routeDomain = resolveRouteDomain(pathname);

  if (pathname === "/") {
    if (isStaff) return redirect(request, defaultStaffPath);
    if (isGuest) return redirect(request, GUEST_DEFAULT_ROUTE);
    return redirect(request, ANONYMOUS_DEFAULT_ROUTE);
  }

  switch (routeDomain) {
    case "anonymous":
      return withIntl(request);

    case "guest":
      if (isGuest) return withIntl(request);
      if (isStaff) return redirect(request, defaultStaffPath);
      return redirect(request, ANONYMOUS_DEFAULT_ROUTE);

    case "staff":
      if (!isStaff) {
        if (isGuest) return redirect(request, GUEST_DEFAULT_ROUTE);
        return redirect(request, ANONYMOUS_DEFAULT_ROUTE);
      }

      if (!canAccessPathWithSnapshot(pathname, authzSnapshot)) {
        return redirect(request, defaultStaffPath);
      }
      return withIntl(request);

    case "auth":
      if (isStaff) return redirect(request, defaultStaffPath);
      if (isGuest) return redirect(request, GUEST_DEFAULT_ROUTE);
      return withIntl(request);

    default:
      if (isStaff) return redirect(request, defaultStaffPath);
      if (isGuest) return redirect(request, GUEST_DEFAULT_ROUTE);
      return redirect(request, ANONYMOUS_DEFAULT_ROUTE);
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
