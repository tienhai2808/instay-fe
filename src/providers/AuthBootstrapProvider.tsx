"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getMe } from "@/apis/auth";
import { getBookingRoomInfo } from "@/apis/booking_room";
import { AUTHZ_COOKIE_KEY } from "@/constants/access-control";
import { GUEST_TOKEN } from "@/constants/token";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGuestStore } from "@/stores/useGuestStore";
import { getCookie } from "@/utils/cookies";
import { resolveRouteDomain } from "@/utils/route-domains";

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  if (!("response" in error)) return undefined;

  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== "object") return undefined;

  const status = (response as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

export default function AuthBootstrapProvider() {
  const pathname = usePathname();
  const routeDomain = resolveRouteDomain(pathname || "/");

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  const isGuestAuthenticated = useGuestStore(
    (state) => state.isGuestAuthenticated,
  );
  const bookingRoom = useGuestStore((state) => state.bookingRoom);
  const clearGuest = useGuestStore((state) => state.clearGuest);
  const setGuestVerifiedBookingRoom = useGuestStore(
    (state) => state.setGuestVerifiedBookingRoom,
  );

  const staffBootstrapInFlightRef = useRef(false);
  const guestBootstrapInFlightRef = useRef(false);

  useEffect(() => {
    const hasStaffCookie = Boolean(getCookie(AUTHZ_COOKIE_KEY));
    const shouldBootstrapStaff =
      routeDomain === "staff" &&
      hasStaffCookie &&
      (isAuthenticated !== true || !user);

    if (!shouldBootstrapStaff || staffBootstrapInFlightRef.current) return;

    staffBootstrapInFlightRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const response = await getMe();
        if (cancelled) return;

        const user = response.data?.data?.user ?? null;
        setUser(user);
        setAuthenticated(Boolean(user));
      } catch (error) {
        if (cancelled) return;

        const status = getErrorStatus(error);
        if (status === 401 || status === 403) {
          setAuthenticated(false);
          setUser(null);
        }
      } finally {
        staffBootstrapInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, routeDomain, setAuthenticated, setUser, user]);

  useEffect(() => {
    const hasGuestToken = Boolean(getCookie(GUEST_TOKEN));
    const shouldBootstrapGuest =
      routeDomain === "guest" &&
      hasGuestToken &&
      (!isGuestAuthenticated || !bookingRoom);

    if (!shouldBootstrapGuest || guestBootstrapInFlightRef.current) return;

    guestBootstrapInFlightRef.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const response = await getBookingRoomInfo();
        if (cancelled) return;

        const bookingRoom = response.data?.data?.booking_room ?? null;
        setGuestVerifiedBookingRoom(bookingRoom);
      } catch (error) {
        if (cancelled) return;

        const status = getErrorStatus(error);
        if (status === 401 || status === 404) {
          clearGuest();
        }
      } finally {
        guestBootstrapInFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    bookingRoom,
    clearGuest,
    isGuestAuthenticated,
    routeDomain,
    setGuestVerifiedBookingRoom,
  ]);

  return null;
}
