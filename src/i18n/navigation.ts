import { createNavigation } from "next-intl/navigation";
import { pathnames, locales, localePrefix } from "../config/locale";
import { DEFAULT_LOCALE } from "@/constants/locale";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({
    locales,
    defaultLocale: DEFAULT_LOCALE,
    pathnames,
    localePrefix,
  });
