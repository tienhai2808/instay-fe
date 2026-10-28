"use client";

import React, { useEffect } from "react";

import Navbar from "@/components/guest/layout/Navbar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGuestStore } from "@/stores/useGuestStore";

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // If we can render guest routes, middleware has already validated the guest cookie.
    // Treat that as an authenticated guest session on the client.
    useGuestStore.getState().setGuestAuthenticated(true);

    // Guest UX shouldn't carry staff auth local storage around.
    useAuthStore.getState().clearAuth();
    useAuthStore.persist.clearStorage();
  }, []);

  return (
    <>
      <main className="flex-1 min-h-screen overflow-y-auto bg-white">
        {children}
      </main>
      <Navbar />
    </>
  );
}
