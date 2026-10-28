export const LOCALE_EN = "en";
export const LOCALE_VI = "vi";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const LOCALES = [LOCALE_VI, LOCALE_EN] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = LOCALE_VI;
export const NEXT_LOCALE_COOKIE = "NEXT_LOCALE";

export const isSupportedLocale = (value?: string | null): value is AppLocale =>
  value === LOCALE_EN || value === LOCALE_VI;

export const resolveLocale = (value?: string | null): AppLocale =>
  isSupportedLocale(value) ? value : DEFAULT_LOCALE;
