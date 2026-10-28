"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";

interface GuestState {
  isGuestAuthenticated: boolean;
  setGuestAuthenticated: (value: boolean) => void;
  bookingRoom: SimpleBookingRoomResponse | null;
  setBookingRoom: (value: SimpleBookingRoomResponse | null) => void;
  setGuestVerifiedBookingRoom: (
    value: SimpleBookingRoomResponse | null,
  ) => void;

  clearGuest: () => void;
}

export const useGuestStore = create<GuestState>()(
  persist(
    (set) => ({
      isGuestAuthenticated: false,
      bookingRoom: null,
      setGuestAuthenticated: (value: boolean) =>
        set({ isGuestAuthenticated: value }),
      setBookingRoom: (value: SimpleBookingRoomResponse | null) =>
        set({ bookingRoom: value }),
      setGuestVerifiedBookingRoom: (value: SimpleBookingRoomResponse | null) =>
        set({
          isGuestAuthenticated: true,
          bookingRoom: value,
        }),

      clearGuest: () =>
        set({
          isGuestAuthenticated: false,
          bookingRoom: null,
        }),
    }),
    {
      name: "instay:guest",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isGuestAuthenticated: state.isGuestAuthenticated,
        bookingRoom: state.bookingRoom,
      }),
    },
  ),
);
