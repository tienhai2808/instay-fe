"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { AiOutlineHome } from "react-icons/ai";
import { LiaSyncSolid } from "react-icons/lia";
import { PiChatsCircle } from "react-icons/pi";
import { RiShoppingCartLine } from "react-icons/ri";

type NavKey = "home" | "requests" | "messages" | "orders";

const labels: Record<"vi" | "en", Record<NavKey, string>> = {
  vi: {
    home: "Trang Chủ",
    requests: "Yêu Cầu",
    messages: "Nhắn Tin",
    orders: "Đơn Hàng",
  },
  en: {
    home: "Home",
    requests: "Requests",
    messages: "Messages",
    orders: "Orders",
  },
};

const navItems = [
  { key: "home" as const, href: "/home", icon: AiOutlineHome },
  { key: "requests" as const, href: "/requests", icon: LiaSyncSolid },
  { key: "messages" as const, href: "/messages", icon: PiChatsCircle },
  { key: "orders" as const, href: "/orders", icon: RiShoppingCartLine },
];

const isActivePath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export default function Navbar() {
  const pathname = usePathname();
  const locale = useLocale();
  const text = locale === "en" ? labels.en : labels.vi;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
      <ul className="mx-auto grid h-16 w-full max-w-screen-sm grid-cols-4">
        {navItems.map(({ key, href, icon: Icon }) => {
          const isActive = isActivePath(pathname, href);

          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                  isActive
                    ? "bg-[#8b5cf6] text-white border-none rounded-none shadow-none"
                    : "text-[#6B7280] hover:text-black"
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="leading-none">{text[key]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
