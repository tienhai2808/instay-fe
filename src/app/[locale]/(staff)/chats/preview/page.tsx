"use client";

import { getBookingRoomByIdBasic } from "@/apis/booking_room";
import { useMessage } from "@/providers/MessageProvider";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import PreviewDetail from "../components/PreviewDetail";
import Sidebar from "../components/Sidebar";
import { useStaffChatsSidebar } from "../hooks/useStaffChatsSidebar";
import { toTrimmedString } from "../utils/chat-utils";

export default function ChatPreviewPage() {
  const t = useTranslations("MessagesPage");
  const searchParams = useSearchParams();
  const messageApi = useMessage();
  const bookingRoomId = searchParams.get("booking_room_id")?.trim() || "";
  const initialChatId = searchParams.get("chat_id")?.trim() || "";

  const {
    data: bookingRoomRes,
    error: bookingRoomError,
    isFetching: isBookingRoomFetching,
  } = useQuery({
    queryKey: ["staff", "chats", "preview", "booking-room", bookingRoomId],
    queryFn: async () => await getBookingRoomByIdBasic(bookingRoomId),
    enabled: bookingRoomId.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!bookingRoomError) return;
    messageApi.errorFromApi(bookingRoomError);
  }, [bookingRoomError, messageApi]);

  const bookingRoom = useMemo(
    () => bookingRoomRes?.data?.data?.booking_room || null,
    [bookingRoomRes?.data?.data?.booking_room],
  );

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
    activeChatId: initialChatId,
    previewBookingRoom: bookingRoom,
  });

  const activeItemKey = useMemo(() => {
    if (!bookingRoomId) return "";

    const previewItem = sidebarItems.find((item) => {
      return (
        item.mode === "preview" &&
        item.href.includes(
          `booking_room_id=${encodeURIComponent(toTrimmedString(bookingRoomId))}`,
        )
      );
    });
    if (previewItem) return previewItem.key;

    const existingChatItem = sidebarItems.find((item) => {
      return (
        item.mode === "detail" && toTrimmedString(item.chatId) === initialChatId
      );
    });
    return existingChatItem?.key || "";
  }, [bookingRoomId, initialChatId, sidebarItems]);

  return (
    <div className="h-full min-h-[calc(100vh-160px)] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
      <div className="hidden h-full min-h-0 grid-cols-[360px_minmax(0,1fr)] lg:grid">
        <Sidebar
          title={t("title")}
          searchValue={searchInput}
          searchPlaceholder={t("searchPlaceholder")}
          items={sidebarItems}
          activeItemKey={activeItemKey}
          isLoading={isLoading || isBookingRoomFetching}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          loadingMoreLabel={t("loadingMore")}
          emptyLabel={t("empty")}
          onSearchChange={setSearchInput}
          onOpenChat={markChatAsRead}
          loadMoreRef={loadMoreRef}
        />
        <PreviewDetail
          bookingRoomId={bookingRoomId}
          bookingRoom={bookingRoom}
          initialChatId={initialChatId}
        />
      </div>

      <div className="h-full lg:hidden">
        <PreviewDetail
          bookingRoomId={bookingRoomId}
          bookingRoom={bookingRoom}
          initialChatId={initialChatId}
          floatingComposerOnMobile
          showBackButton
        />
      </div>
    </div>
  );
}
