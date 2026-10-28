const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

type FriendlyPublishedAtOptions = {
  justNowLabel: string;
  locale: string;
  unknownLabel: string;
  withTimeAfterOneWeek?: boolean;
};

const normalizeLocale = (locale: string) =>
  locale === "vi" ? "vi-VN" : locale === "en" ? "en-US" : locale;

export const formatFriendlyPublishedAt = (
  value: string | null | undefined,
  {
    justNowLabel,
    locale,
    unknownLabel,
    withTimeAfterOneWeek = false,
  }: FriendlyPublishedAtOptions,
) => {
  if (!value) return unknownLabel;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unknownLabel;

  const normalizedLocale = normalizeLocale(locale);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < MINUTE_IN_MS) {
    return justNowLabel;
  }

  const relativeFormatter = new Intl.RelativeTimeFormat(normalizedLocale, {
    numeric: "always",
  });

  if (absDiffMs < HOUR_IN_MS) {
    return relativeFormatter.format(
      Math.round(diffMs / MINUTE_IN_MS),
      "minute",
    );
  }

  if (absDiffMs < DAY_IN_MS) {
    return relativeFormatter.format(Math.round(diffMs / HOUR_IN_MS), "hour");
  }

  if (absDiffMs < WEEK_IN_MS) {
    return relativeFormatter.format(Math.round(diffMs / DAY_IN_MS), "day");
  }

  return new Intl.DateTimeFormat(normalizedLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTimeAfterOneWeek
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};
