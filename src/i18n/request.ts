import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { Locale } from "../config/locale";
import { resolveLocale } from "@/constants/locale";

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Ensure that a valid locale is used
  locale = resolveLocale(locale);
  if (!routing.locales.includes(locale as Locale))
    locale = routing.defaultLocale;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
