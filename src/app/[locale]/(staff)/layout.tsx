"use client";
import React, { useEffect, useState } from "react";
import { useGuestStore } from "@/stores/useGuestStore";

interface StaffLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

import { Sidebar } from "@/components/staff/layout/Sidebar";
import { Header } from "@/components/staff/layout/Header";

export default function StaffLayout({ children }: StaffLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    useGuestStore.getState().clearGuest();
    useGuestStore.persist.clearStorage();
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setMobileSidebarOpen(false);
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-montserrat">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}
      <div className="flex-1 h-full flex flex-col overflow-hidden">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 h-full overflow-y-auto bg-white px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
