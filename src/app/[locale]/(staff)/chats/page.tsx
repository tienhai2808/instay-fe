"use client";

import EmptyState from "./components/EmptyState";
import Sidebar from "./components/Sidebar";
import { useStaffChatsSidebar } from "./hooks/useStaffChatsSidebar";
import { useTranslations } from "next-intl";

export default function ChatsPage() {
  const t = useTranslations("MessagesPage");
  const {
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    searchInput,
    setSearchInput,
    sidebarItems,
    markChatAsRead,
  } = useStaffChatsSidebar({});

  return (
    <div className="h-full min-h-[calc(100vh-160px)] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="hidden h-full min-h-0 grid-cols-[360px_minmax(0,1fr)] lg:grid">
        <Sidebar
          title={t("title")}
          searchValue={searchInput}
          searchPlaceholder={t("searchPlaceholder")}
          items={sidebarItems}
          activeItemKey=""
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadingMoreLabel={t("loadingMore")}
          emptyLabel={t("empty")}
          onSearchChange={setSearchInput}
          onOpenChat={markChatAsRead}
          loadMoreRef={loadMoreRef}
        />
        <EmptyState
          title={t("staff.placeholderTitle")}
          description={t("staff.placeholderDescription")}
          hint={t("staff.placeholderHint")}
        />
      </div>

      <div className="h-full lg:hidden">
        <Sidebar
          title={t("title")}
          searchValue={searchInput}
          searchPlaceholder={t("searchPlaceholder")}
          items={sidebarItems}
          activeItemKey=""
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadingMoreLabel={t("loadingMore")}
          emptyLabel={t("empty")}
          onSearchChange={setSearchInput}
          onOpenChat={markChatAsRead}
          loadMoreRef={loadMoreRef}
          className="border-r-0"
        />
      </div>
    </div>
  );
}
