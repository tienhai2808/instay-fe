import Cookies from "js-cookie";
import { AUTHZ_COOKIE_KEY } from "@/constants/access-control";
import type { User } from "@/types/data/user";
import { createAuthzSnapshot, serializeAuthzSnapshot } from "./access-control";

export const syncAuthzCookie = (user?: User | null) => {
  if (typeof window === "undefined") return;

  if (!user) {
    Cookies.remove(AUTHZ_COOKIE_KEY, { path: "/" });
    return;
  }

  const snapshot = createAuthzSnapshot(user);
  const serialized = serializeAuthzSnapshot(snapshot);

  Cookies.set(AUTHZ_COOKIE_KEY, serialized, {
    expires: 30,
    path: "/",
    sameSite: "lax",
  });
};

export const clearAuthzCookie = () => {
  if (typeof window === "undefined") return;
  Cookies.remove(AUTHZ_COOKIE_KEY, { path: "/" });
};
