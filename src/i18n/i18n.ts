import { getRequestConfig } from "next-intl/server";
import { locales, Locale } from "../config/locale";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/constants/locale";

export default getRequestConfig(async ({ locale }) => {
  const l = resolveLocale(locale as string | null);
  if (!locales.includes(l as Locale)) notFound();
  return {
    locale: l,
    messages: (await import(`./messages/${l}.json`)).default,
  };
});
