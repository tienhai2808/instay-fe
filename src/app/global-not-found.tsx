import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getTranslations } from "next-intl/server";
import "./globals.css";
import { getRequestLocale } from "@/utils/server/request-locale";
import { getNotFoundDefaultHref } from "@/utils/server/not-found-navigation";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = await getTranslations({ locale, namespace: "NotFoundPage.global" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function GlobalNotFound() {
  const locale = await getRequestLocale();
  const t = await getTranslations({ locale, namespace: "NotFoundPage.global" });
  const defaultHref = await getNotFoundDefaultHref("/login");

  return (
    <html lang={locale} className={inter.className}>
      <body className="min-h-screen bg-[#f8fafc] text-[#111827]">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
          <div className="w-full rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#6b7280]">
              {t("code")}
            </p>
            <h1 className="mt-3 text-3xl font-bold">{t("title")}</h1>
            <p className="mt-3 text-sm text-[#4b5563]">{t("description")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={defaultHref}
                className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white"
              >
                {t("primaryAction")}
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
