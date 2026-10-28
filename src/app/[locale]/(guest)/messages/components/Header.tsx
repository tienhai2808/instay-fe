"use client";

import { FiMoreVertical, FiPhone } from "react-icons/fi";
import { resolveDepartmentInitials } from "../utils/chat-utils";

interface MessageHeaderProps {
  departmentName: string;
}

export default function MessageHeader({ departmentName }: MessageHeaderProps) {
  const avatarLabel = resolveDepartmentInitials(departmentName);

  return (
    <header className="border-b border-[#e5e7eb] bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fde047] text-sm font-bold text-[#111827]">
            {avatarLabel}
          </div>
          <h1 className="truncate text-base text-[#1f2937]">
            {departmentName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
