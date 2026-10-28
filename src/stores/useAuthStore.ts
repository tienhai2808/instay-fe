import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/types/data/user";
import { clearAuthzCookie, syncAuthzCookie } from "@/utils/authz-cookie";

interface AuthState {
  forgotPasswordToken: string;
  setForgotPasswordToken: (token: string) => void;

  resetPasswordToken: string;
  setResetPasswordToken: (token: string) => void;

  isAuthenticated: boolean | null;
  setAuthenticated: (value: boolean) => void;

  user: User | null;
  setUser: (user: User | null) => void;

  unreadNotificationsCount: number;
  setUnreadNotificationsCount: (count: number) => void;
  incrementUnreadNotificationsCount: () => void;
  decrementUnreadNotificationsCount: () => void;
  resetUnreadNotificationsCount: () => void;

  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      forgotPasswordToken: "",
      setForgotPasswordToken: (token: string) =>
        set({ forgotPasswordToken: token }),

      resetPasswordToken: "",
      setResetPasswordToken: (token: string) =>
        set({ resetPasswordToken: token }),

      isAuthenticated: null,
      setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),

      user: null,
      setUser: (user: User | null) => {
        syncAuthzCookie(user);
        set({ user });
      },

      unreadNotificationsCount: 0,
      setUnreadNotificationsCount: (count: number) =>
        set({
          unreadNotificationsCount:
            Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
        }),
      incrementUnreadNotificationsCount: () =>
        set((state) => ({
          unreadNotificationsCount: state.unreadNotificationsCount + 1,
        })),
      decrementUnreadNotificationsCount: () =>
        set((state) => ({
          unreadNotificationsCount: Math.max(
            0,
            state.unreadNotificationsCount - 1,
          ),
        })),
      resetUnreadNotificationsCount: () => set({ unreadNotificationsCount: 0 }),

      clearAuth: () => {
        clearAuthzCookie();
        set({
          isAuthenticated: null,
          user: null,
          unreadNotificationsCount: 0,
          forgotPasswordToken: "",
          resetPasswordToken: "",
        });
      },
    }),
    {
      name: "instay:auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    },
  ),
);
