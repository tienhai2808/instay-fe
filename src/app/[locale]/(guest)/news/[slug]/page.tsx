"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getGuestNewsBySlug } from "@/apis/event";
import RichTextContent from "@/components/shared/ui/RichTextContent";
import { useMessage } from "@/providers/MessageProvider";
import type { NewsDetail } from "@/types/data/event";
import { formatFriendlyPublishedAt } from "@/utils/friendly-time";
import { resolvePublicImageUrl } from "@/utils/media";

const normalizeGuestNewsDetailPayload = (
  payload: unknown,
): NewsDetail | null => {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const candidate =
    "event" in record && record.event && typeof record.event === "object"
      ? record.event
      : payload;

  if (!candidate || typeof candidate !== "object") return null;

  const news = candidate as NewsDetail;
  return news.id ? news : null;
};

export default function NewsDetailsPage() {
  const locale = useLocale();
  const t = useTranslations("NewsDetailsPage");
  const messageApi = useMessage();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const { data, error, isFetching } = useQuery({
    queryKey: ["guest", "news", "details", slug],
    queryFn: async () => getGuestNewsBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!error) return;
    messageApi.errorFromApi(error);
  }, [error, messageApi]);

  const news = useMemo(
    () => normalizeGuestNewsDetailPayload(data?.data?.data),
    [data?.data?.data],
  );

  const thumbnailUrl = useMemo(
    () => resolvePublicImageUrl(news?.thumbnail || undefined),
    [news?.thumbnail],
  );

  const publishedAtLabel = (() => {
    return formatFriendlyPublishedAt(news?.published_at, {
      locale,
      unknownLabel: t("publishedAtEmpty"),
      justNowLabel: t("justNow"),
      withTimeAfterOneWeek: true,
    });
  })();

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-10">
      <section className="p-4 pb-3">
        <h1 className="mt-4 text-xl font-bold text-[#111827]">
          {news?.title?.trim() || t("fallbackTitle")}
        </h1>
        <p className="mt-2 text-sm font-medium text-[#8b5cf6]">
          {publishedAtLabel}
        </p>
      </section>

      <section className="px-4 pb-4">
        {isFetching ? (
          <div className="h-52 w-full animate-pulse rounded-3xl bg-[#efe9ff]" />
        ) : thumbnailUrl ? (
          <div className="relative h-52 w-full overflow-hidden rounded-3xl bg-[#efe9ff]">
            <Image
              src={thumbnailUrl}
              alt={news?.title || "news-image"}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
            {t("imageEmpty")}
          </p>
        )}
      </section>

      <section className="px-4 pb-4">
        <h3 className="mt-4 text-base font-bold text-[#111827]">
          {t("contentTitle")}
        </h3>
        <RichTextContent
          value={news?.content}
          emptyFallback={t("contentEmpty")}
          className="text-sm leading-6 text-[#374151]"
        />
      </section>
    </div>
  );
}
