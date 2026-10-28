import { cookies } from "next/headers";
import { AUTHZ_COOKIE_KEY } from "@/constants/access-control";
import { GUEST_TOKEN } from "@/constants/token";
import { GUEST_DEFAULT_ROUTE } from "@/constants/route-domains";
import {
  deserializeAuthzSnapshot,
  getDefaultRouteForSnapshot,
} from "@/utils/access-control";

export const getNotFoundDefaultHref = async (fallbackHref: string) => {
  const cookieStore = await cookies();
  const hasGuestToken = Boolean(cookieStore.get(GUEST_TOKEN)?.value);
  if (hasGuestToken) {
    return GUEST_DEFAULT_ROUTE;
  }

  const snapshot = deserializeAuthzSnapshot(
    cookieStore.get(AUTHZ_COOKIE_KEY)?.value,
  );
  if (!snapshot) return fallbackHref;

  return getDefaultRouteForSnapshot(snapshot);
};
