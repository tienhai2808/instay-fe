"use client";

import { AUTH_STORAGE_KEY } from "@/constants/auth";
import { PATH } from "@/constants/path";
import { clearFCMToken } from "@/services/fcm";
import { useAuthStore } from "@/stores/useAuthStore";
import { clearAuthzCookie } from "@/utils/authz-cookie";
import { getGuestToken, removeGuestToken, removeTokens } from "@/utils/token";

const hasPersistedAuthState = () => {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw) as {
      state?: { isAuthenticated?: boolean | null; user?: unknown };
    };
    return Boolean(
      parsed?.state?.user || parsed?.state?.isAuthenticated !== null,
    );
  } catch {
    return true;
  }
};

export const hasAnyClientAuthData = () => {
  const state = useAuthStore.getState();
  return (
    hasPersistedAuthState() ||
    Boolean(getGuestToken()) ||
    Boolean(state.user) ||
    state.isAuthenticated !== null
  );
};

const clearBrowserStorage = () => {
  if (typeof window === "undefined") return;
  window.localStorage.clear();
  window.sessionStorage.clear();
};

export const clearStaffClientData = () => {
  if (typeof window !== "undefined") {
    void clearFCMToken();
  }

  useAuthStore.getState().clearAuth();
  useAuthStore.persist.clearStorage();
  clearAuthzCookie();
  removeTokens();
  clearBrowserStorage();
};

export const clearGuestClientData = () => {
  removeGuestToken();
  clearBrowserStorage();
};

export const switchToGuestSession = () => {
  clearStaffClientData();
};

export const switchToStaffSession = () => {
  clearGuestClientData();
};

export const clearClientAuthData = () => {
  clearStaffClientData();
};

export const forceLogoutToLogin = () => {
  clearStaffClientData();

  if (typeof window === "undefined") return;
  if (window.location.pathname !== PATH.LOGIN) {
    window.location.replace(PATH.LOGIN);
  }
};
