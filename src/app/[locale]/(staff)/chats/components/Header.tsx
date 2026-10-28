"use client";

import { Link } from "@/i18n/routing";
import { FiChevronLeft, FiMoreVertical, FiPhone } from "react-icons/fi";
import { resolveChatInitials } from "../utils/chat-utils";

interface MessageHeaderProps {
  title: string;
  showBackButton?: boolean;
}

export default function MessageHeader({
  title,
  showBackButton = false,
}: MessageHeaderProps) {
  const avatarLabel = resolveChatInitials(title);

  return (
    <header className="border-b border-[#e5e7eb] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton ? (
            <Link
              href="/chats"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6b7280] transition-colors active:bg-[#e5e7eb]"
              aria-label="Back to chats"
            >
              <FiChevronLeft className="h-5 w-5" />
            </Link>
          ) : null}

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde047] text-sm font-bold text-[#111827]">
            {avatarLabel}
          </div>

          <h1 className="truncate text-base font-semibold text-[#1f2937]">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b7280] transition-colors active:bg-[#e5e7eb]"
            aria-label="Call"
          >
            <FiPhone className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#6b7280] transition-colors active:bg-[#e5e7eb]"
            aria-label="More options"
          >
            <FiMoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
