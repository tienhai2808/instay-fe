"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import Image from "next/image";
import { MENU_ITEMS } from "@/constants/menu-items";
import { IoMenuOutline, IoSettingsOutline } from "react-icons/io5";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  canManageBooking,
  canManageGuests,
  canManageOrderServices,
  canManageSupportTickets,
  createAuthzSnapshot,
  isAdminSnapshot,
  isStaffSnapshot,
} from "@/utils/access-control";

const { Sider } = Layout;
type MenuItem = Required<MenuProps>["items"][number];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  setCollapsed,
  isMobile,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("Sidebar");
  const user = useAuthStore((state) => state.user);
  const authzSnapshot = React.useMemo(() => createAuthzSnapshot(user), [user]);
  const isCollapsed = isMobile ? false : collapsed;
  const mobileTranslateClass = mobileOpen
    ? "translate-x-0"
    : "-translate-x-full";

  const isAdmin = isAdminSnapshot(authzSnapshot);
  const isStaff = isStaffSnapshot(authzSnapshot);
  const menuBodyHeight = isAdmin ? "calc(100% - 130px)" : "calc(100% - 64px)";

  const filteredMenuItems = React.useMemo(() => {
    if (isAdmin) return MENU_ITEMS;
    if (!isStaff) return [];

    return MENU_ITEMS.map((item) => {
      if (item.id === "overview") return null;

      if (item.subItems?.length) {
        const filteredSubItems = item.subItems.filter((subItem) => {
          if (
            subItem.href === "/bookings" ||
            subItem.href === "/price-calculator"
          ) {
            return canManageBooking(authzSnapshot);
          }

          if (subItem.href === "/order-services") {
            return canManageOrderServices(authzSnapshot);
          }

          if (subItem.href === "/support-tickets") {
            return canManageSupportTickets(authzSnapshot);
          }

          return false;
        });

        if (!filteredSubItems.length) return null;

        return {
          ...item,
          subItems: filteredSubItems,
        };
      }

      if (item.href === "/bookings") {
        return canManageBooking(authzSnapshot) ? item : null;
      }

      if (item.href === "/accommodation") {
        return canManageGuests(authzSnapshot) ? item : null;
      }

      if (item.href === "/customers") {
        return null;
      }

      if (item.href === "/chats") {
        return item;
      }

      if (item.href === "/reviews") {
        return item;
      }

      return null;
    }).filter((item): item is (typeof MENU_ITEMS)[number] => Boolean(item));
  }, [authzSnapshot, isAdmin, isStaff]);

  const toggleSidebar = () => {
    if (isMobile) {
      onMobileClose();
      return;
    }
    setCollapsed(!collapsed);
  };

  const items: MenuItem[] = filteredMenuItems.map((item) => {
    return {
      key: item.href || item.id,
      icon: item.icon
        ? React.createElement(item.icon, { className: "w-4 h-4" })
        : null,
      label: item.subItems ? (
        t(item.id)
      ) : (
        <Link
          href={item.href || "#"}
          onClick={isMobile ? onMobileClose : undefined}
          className="cursor-pointer text-inherit"
        >
          {t(item.id)}
        </Link>
      ),
      children: item.subItems
        ? item.subItems.map((sub) => ({
            key: sub.href,
            label: (
              <Link
                href={sub.href}
                onClick={isMobile ? onMobileClose : undefined}
                className="cursor-pointer text-inherit"
              >
                {t(sub.id)}
              </Link>
            ),
          }))
        : null,
    };
  });

  const selectedKeys = [pathname];
  const openKeys = filteredMenuItems
    .filter((item) =>
      item.subItems?.some(
        (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
      ),
    )
    .map((item) => item.href || item.id);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={isCollapsed}
      collapsedWidth={48}
      width={220}
      style={
        isMobile
          ? {
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 40,
            }
          : undefined
      }
      className={`z-40 h-full flex flex-col bg-[#0A0A0A] ${
        isMobile
          ? `transform transition-transform duration-300 ${mobileTranslateClass}`
          : "relative"
      }`}
    >
      <div className="h-16 flex items-center pl-3.5 pr-2 p-2 bg-[#0A0A0A] justify-between border-b border-gray-500">
        {!isCollapsed && (
          <Image
            src="/logo-instay.svg"
            alt="Instay Logo"
            width={100}
            height={40}
            className="h-14 w-auto object-contain"
          />
        )}
        <button
          onClick={toggleSidebar}
          className="text-[#D1D5DC] hover:text-white rounded-md mr-3 cursor-pointer"
        >
          <IoMenuOutline className="w-5 h-5" />
        </button>
      </div>

      <div
        style={{ height: menuBodyHeight }}
        className="py-2 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [&_.ant-menu-item]:!pl-3 [&_.ant-menu-item]:!text-[#D1D5DC] [&_.ant-menu-item]:!font-medium [&_.ant-menu-item-selected]:!text-white [&_.ant-menu-sub.ant-menu-inline]:!bg-transparent [&_.ant-menu-sub_.ant-menu-item]:!ml-[18px] [&_.ant-menu-sub_.ant-menu-item]:!w-[calc(100%-30px)] [&_.ant-menu-sub_.ant-menu-item]:!pl-4 [&_.ant-menu-sub_.ant-menu-item]:!font-normal [&_.ant-menu-submenu-title]:!text-[#D1D5DC] [&_.ant-menu-submenu-title]:!pl-3 [&_.ant-menu-submenu-title]:!font-medium [&_.ant-menu-submenu-selected_.ant-menu-submenu-title]:!text-white bg-[#000000]"
      >
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={items}
          expandIcon={({ isOpen }) =>
            isOpen ? (
              <BsChevronDown className="w-3 h-3 text-white" />
            ) : (
              <BsChevronRight className="w-3 h-3 text-[#D1D5DC]" />
            )
          }
          className="pl-0 pr-1"
          style={{
            borderRight: 0,
            paddingInline: 0,
            fontWeight: 500,
            backgroundColor: "#000000",
          }}
        />
      </div>

      {isAdmin && (
        <div
          className={`absolute bottom-0 w-full py-4 ${
            isCollapsed ? "pl-3.5" : "pl-4"
          } pr-3 bg-[#000000] border-t border-gray-500 z-10 transition-all duration-300`}
        >
          <Link
            href="/settings"
            onClick={isMobile ? onMobileClose : undefined}
            className={`flex items-center justify-start py-2 rounded-md text-sm font-medium transition-colors text-white cursor-pointer ${
              pathname === "/settings" ? "bg-[#3d3d3d]" : "hover:bg-white/10"
            }`}
            title={isCollapsed ? t("settings") : undefined}
          >
            <IoSettingsOutline
              className={`w-4 h-4 ${isCollapsed ? "mx-0.5" : "mr-3"} text-white`}
            />
            {!isCollapsed && (
              <span className="text-white">{t("settings")}</span>
            )}
          </Link>
        </div>
      )}
    </Sider>
  );
}
