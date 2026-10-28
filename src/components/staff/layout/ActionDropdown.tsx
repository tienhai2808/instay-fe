"use client";

import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { FiLogOut, FiMoreVertical } from "react-icons/fi";
import { LOCALE_EN, LOCALE_VI } from "@/constants/locale";

interface ActionDropdownProps {
  onLocaleChange: (locale: string) => void;
  onLogout: () => void;
  logoutPending: boolean;
}

export function ActionDropdown({
  onLocaleChange,
  onLogout,
  logoutPending,
}: ActionDropdownProps) {
  const t = useTranslations("Header");
  const locale = useLocale();

  const isEnglish = locale === LOCALE_EN;
  const isVietnamese = !isEnglish;

  const logoutMenuItems: MenuProps["items"] = [
    {
      key: "logout",
      label: (
        <span className="flex items-center gap-2">
          <FiLogOut className="text-sm text-[#6B7280]" />
          {t("logout")}
        </span>
      ),
      disabled: logoutPending,
      onClick: onLogout,
    },
  ];

  return (
    <Dropdown
      menu={{ items: logoutMenuItems }}
      placement="bottomRight"
      arrow
      trigger={["click"]}
      popupRender={(menu) => (
        <div className="rounded-lg bg-white shadow-lg">
          <div className="border-b border-gray-100 p-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-[#F3F4F6] p-1">
              <button
                type="button"
                onClick={() => onLocaleChange(LOCALE_VI)}
                disabled={isVietnamese}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  isVietnamese
                    ? "cursor-not-allowed bg-white text-[#111827] shadow-sm"
                    : "cursor-pointer text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                VI
              </button>
              <div className="h-6 w-px bg-[#E5E7EB]" />
              <button
                type="button"
                onClick={() => onLocaleChange(LOCALE_EN)}
                disabled={isEnglish}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                  isEnglish
                    ? "cursor-not-allowed bg-white text-[#111827] shadow-sm"
                    : "cursor-pointer text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                EN
              </button>
            </div>
          </div>
          {menu}
        </div>
      )}
    >
      <Button
        type="text"
        className="flex !text-gray-500 transition-colors hover:!text-black"
        icon={<FiMoreVertical className="mt-1.5 h-4 w-4" />}
      />
    </Dropdown>
  );
}
