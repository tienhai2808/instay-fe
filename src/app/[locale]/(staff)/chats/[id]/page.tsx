"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import ChatDetail from "../components/ChatDetail";
import Sidebar from "../components/Sidebar";
import { useStaffChatsSidebar } from "../hooks/useStaffChatsSidebar";
import { toTrimmedString } from "../utils/chat-utils";

export default function ChatDetailsPage() {
  const t = useTranslations("MessagesPage");
  const params = useParams<{ id: string }>();
  const chatId = params?.id?.trim() || "";

  const {
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMoreRef,
    searchInput,
    setSearchInput,
    sidebarItems,
    markChatAsRead,
  } = useStaffChatsSidebar({
    activeChatId: chatId,
  });

  const activeItemKey = useMemo(() => {
    return (
      sidebarItems.find((item) => toTrimmedString(item.chatId) === chatId)
        ?.key || ""
    );
  }, [chatId, sidebarItems]);

  return (
    <div className="h-full min-h-[calc(100vh-160px)] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="hidden h-full min-h-0 grid-cols-[360px_minmax(0,1fr)] lg:grid">
        <Sidebar
          title={t("title")}
          searchValue={searchInput}
          searchPlaceholder={t("searchPlaceholder")}
          items={sidebarItems}
          activeItemKey={activeItemKey}
          isLoading={isLoading}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadingMoreLabel={t("loadingMore")}
          emptyLabel={t("empty")}
          onSearchChange={setSearchInput}
          onOpenChat={markChatAsRead}
          loadMoreRef={loadMoreRef}
        />
        <ChatDetail chatId={chatId} />
      </div>

      <div className="h-full lg:hidden">
        <ChatDetail chatId={chatId} floatingComposerOnMobile showBackButton />
      </div>
    </div>
  );
}
