"use client";

import { Link } from "@/i18n/routing";
import type { RefObject } from "react";
import { FiSearch } from "react-icons/fi";
import type { StaffSidebarItem } from "../hooks/useStaffChatsSidebar";

interface SidebarProps {
  title: string;
  searchValue: string;
  searchPlaceholder: string;
  items: StaffSidebarItem[];
  activeItemKey: string;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  loadingMoreLabel: string;
  emptyLabel: string;
  onSearchChange: (value: string) => void;
  onOpenChat?: (chatId: string) => void;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  className?: string;
}

export default function Sidebar({
  title,
  searchValue,
  searchPlaceholder,
  items,
  activeItemKey,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  loadingMoreLabel,
  emptyLabel,
  onSearchChange,
  onOpenChat,
  loadMoreRef,
  className = "",
}: SidebarProps) {
  return (
    <aside
      className={`flex h-full min-h-0 flex-col border-r border-[#e5e7eb] bg-white ${className}`}
    >
      <div className="border-b border-[#e5e7eb] px-4 pb-4 pt-5">
        <h1 className="text-2xl font-bold leading-tight text-[#111827]">
          {title}
        </h1>
        <label className="relative mt-4 block">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-xl border border-[#e5e7eb] bg-white px-9 pr-3 text-sm text-[#111827] shadow-[0_1px_3px_rgba(15,23,42,0.12)] outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20"
          />
        </label>
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-4"
              >
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-[#fde047]" />
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-1/2 animate-pulse rounded-md bg-[#e5e7eb]" />
                  <div className="mt-2 h-4 w-4/5 animate-pulse rounded-md bg-[#e5e7eb]" />
                </div>
                <div className="h-4 w-8 animate-pulse rounded-md bg-[#e5e7eb]" />
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div>
            {items.map((item) => {
              const isActive = activeItemKey === item.key;
              const isUnread = item.unreadCount > 0;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => onOpenChat?.(item.chatId)}
                  className={`flex items-center gap-3 border-b border-[#e5e7eb] px-4 py-4 transition-colors active:bg-[#eceff3] ${
                    isActive ? "bg-[#f3f4f6]" : "bg-white"
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fde047] text-sm font-bold text-[#111827]">
                    {item.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[15px] font-semibold leading-tight text-[#111827]">
                      {item.displayName}
                    </p>
                    <p
                      className={`line-clamp-1 text-sm ${
                        isUnread
                          ? "font-semibold text-[#111827]"
                          : "text-[#6b7280]"
                      }`}
                    >
                      {item.previewText}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[#9ca3af]">
                      {item.previewTime}
                    </span>
                    {isUnread ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                    ) : null}
                  </div>
                </Link>
              );
            })}

            {hasNextPage ? <div ref={loadMoreRef} className="h-1" /> : null}
            {isFetchingNextPage ? (
              <p className="px-4 py-3 text-center text-sm font-medium text-[#6b7280]">
                {loadingMoreLabel}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="px-4 py-6">
            <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-5 text-center text-sm font-medium text-[#6b7280]">
              {emptyLabel}
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}
