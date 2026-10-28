import { Pathnames } from "next-intl/routing";
import { LOCALES, AppLocale } from "@/constants/locale";

export const locales = LOCALES;

export type Locales = typeof locales;
export type Locale = AppLocale;
export const pathnames: Pathnames<Locales> = {
  "/": "/",
  "/pathnames": "/pathnames",
};

export const localePrefix = "never" as const;
