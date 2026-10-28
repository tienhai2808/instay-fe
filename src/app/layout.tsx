import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import MessageProvider from "../providers/MessageProvider";
import FCMProvider from "../providers/FCMProvider";
import FaroProvider from "../providers/FaroProvider";
import WebSocketProvider from "../providers/WebSocketProvider";
import ReactQueryProvider from "../providers/ReactQueryProvider";
import TenantProvider from "../providers/TenantProvider";
import AuthBootstrapProvider from "@/providers/AuthBootstrapProvider";
import { NEXT_LOCALE_COOKIE, resolveLocale } from "@/constants/locale";
import { ConfigProvider } from "antd";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Instay",
  description: "Intelligent Properties Management System",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Instay",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/logo-mobile.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(NEXT_LOCALE_COOKIE)?.value);

  return (
    <html lang={locale}>
      <body className={`${inter.variable} font-sans`}>
        <ConfigProvider
          theme={{
            token: {
              fontFamily: "var(--font-inter), sans-serif",
            },
            components: {
              Menu: {
                itemSelectedBg: "#3d3d3d",
                itemSelectedColor: "#ffffff",
                itemColor: "#D1D5DC",
                itemHoverBg: "rgba(255, 255, 255, 0.1)",
                itemHoverColor: "#ffffff",
                itemBorderRadius: 8,
                subMenuItemBg: "transparent",
                groupTitleColor: "rgba(255, 255, 255, 0.5)",
                itemActiveBg: "transparent",
                activeBarHeight: 0,
              },
            },
          }}
        >
          <ReactQueryProvider>
            <MessageProvider>
              <FaroProvider />
              <TenantProvider />
              <AuthBootstrapProvider />
              <FCMProvider />
              <WebSocketProvider />
              {children}
            </MessageProvider>
          </ReactQueryProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
