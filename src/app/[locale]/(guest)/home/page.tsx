"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { getGuestNews } from "@/apis/event";
import { getGuestServices } from "@/apis/service";
import { getGuestServiceTypes } from "@/apis/service_type";
import { getServiceTypeIconComponent } from "@/app/[locale]/(staff)/service-types/constants/icons";
import { Link } from "@/i18n/routing";
import type { NewsSummary } from "@/types/data/event";
import type { GuestServiceSummary } from "@/types/response/service";
import { useMessage } from "@/providers/MessageProvider";
import { formatFriendlyPublishedAt } from "@/utils/friendly-time";
import { resolvePublicImageUrl } from "@/utils/media";
import {
  getServiceDiscountedPrice,
  isServiceDiscountActive,
  type ServiceDiscountSource,
} from "@/utils/service-discount";
import Header from "./components/Header";

const SERVICE_TYPES_PER_ROW = 4;
const COLLAPSED_ROWS = 2;
const MAX_COLLAPSED_ITEMS = SERVICE_TYPES_PER_ROW * COLLAPSED_ROWS;
const POPULAR_SERVICES_LIMIT = 10;
const TODAY_PROMOTIONS_LIMIT = 10;
const SEARCH_SERVICES_LIMIT = 99;
const LATEST_NEWS_LIMIT = 5;

const getServiceThumbnailUrl = (service?: GuestServiceSummary | null) =>
  resolvePublicImageUrl(service?.thumbnail?.key || undefined);

const getNewsThumbnailUrl = (news?: NewsSummary | null) =>
  resolvePublicImageUrl(news?.thumbnail || undefined);

const normalizeGuestNewsListPayload = (payload: unknown): NewsSummary[] => {
  if (Array.isArray(payload)) return payload as NewsSummary[];
  if (!payload || typeof payload !== "object") return [];

  const record = payload as { events?: unknown };
  return Array.isArray(record.events) ? (record.events as NewsSummary[]) : [];
};

const toDiscountSource = (
  service?: GuestServiceSummary | null,
): ServiceDiscountSource => ({
  discount_type:
    service?.discount_type === "percent" || service?.discount_type === "amount"
      ? service.discount_type
      : undefined,
  discount_value:
    typeof service?.discount_value === "number"
      ? service.discount_value
      : undefined,
  discount_start_at: service?.discount_start_at || undefined,
  discount_end_at: service?.discount_end_at || undefined,
});

export default function HomePage() {
  const locale = useLocale();
  const tCollections = useTranslations("CollectionsPage");
  const tLatestNews = useTranslations("HomePage.latestNews");
  const tServiceTypes = useTranslations("HomePage.serviceTypes");
  const tPopularServices = useTranslations("HomePage.popularServices");
  const tTodayPromotions = useTranslations("HomePage.todayPromotions");
  const messageApi = useMessage();

  const [searchValue, setSearchValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const searchKeyword = searchValue.trim();
  const isSearching = searchKeyword.length > 0;

  const {
    data: latestNewsRes,
    error: latestNewsError,
    isFetching: isLatestNewsFetching,
  } = useQuery({
    queryKey: ["guest", "news", "latest", LATEST_NEWS_LIMIT],
    queryFn: async () =>
      getGuestNews({
        sort: "published_at",
        order: "desc",
        limit: LATEST_NEWS_LIMIT,
      }),
    enabled: !isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: serviceTypesRes,
    error: serviceTypesError,
    isFetching: isServiceTypesFetching,
  } = useQuery({
    queryKey: ["guest", "service-types", "basic"],
    queryFn: async () => getGuestServiceTypes(),
    enabled: !isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: popularServicesRes,
    error: popularServicesError,
    isFetching: isPopularServicesFetching,
  } = useQuery({
    queryKey: ["guest", "services", "popular", POPULAR_SERVICES_LIMIT],
    queryFn: async () =>
      getGuestServices({
        sort: "ordered_count",
        order: "desc",
        limit: POPULAR_SERVICES_LIMIT,
      }),
    enabled: !isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: todayPromotionsRes,
    error: todayPromotionsError,
    isFetching: isTodayPromotionsFetching,
  } = useQuery({
    queryKey: ["guest", "services", "today-promotions", TODAY_PROMOTIONS_LIMIT],
    queryFn: async () =>
      getGuestServices({
        has_discount: true,
        limit: TODAY_PROMOTIONS_LIMIT,
      }),
    enabled: !isSearching,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: searchedServicesRes,
    error: searchedServicesError,
    isFetching: isSearchedServicesFetching,
  } = useQuery({
    queryKey: [
      "guest",
      "services",
      "search",
      searchKeyword,
      SEARCH_SERVICES_LIMIT,
    ],
    queryFn: async () =>
      getGuestServices({
        search: searchKeyword,
        limit: SEARCH_SERVICES_LIMIT,
      }),
    enabled: isSearching,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!latestNewsError) return;
    messageApi.errorFromApi(latestNewsError);
  }, [latestNewsError, messageApi]);

  useEffect(() => {
    if (!serviceTypesError) return;
    messageApi.errorFromApi(serviceTypesError);
  }, [messageApi, serviceTypesError]);

  useEffect(() => {
    if (!popularServicesError) return;
    messageApi.errorFromApi(popularServicesError);
  }, [messageApi, popularServicesError]);

  useEffect(() => {
    if (!todayPromotionsError) return;
    messageApi.errorFromApi(todayPromotionsError);
  }, [messageApi, todayPromotionsError]);

  useEffect(() => {
    if (!searchedServicesError) return;
    messageApi.errorFromApi(searchedServicesError);
  }, [messageApi, searchedServicesError]);

  const searchedServices = useMemo(
    () => searchedServicesRes?.data?.data?.services || [],
    [searchedServicesRes?.data?.data?.services],
  );

  const latestNews = useMemo(
    () => normalizeGuestNewsListPayload(latestNewsRes?.data?.data),
    [latestNewsRes?.data?.data],
  );

  const serviceTypes = useMemo(
    () => serviceTypesRes?.data?.data?.service_types || [],
    [serviceTypesRes?.data?.data?.service_types],
  );

  const shouldShowViewAll = serviceTypes.length > MAX_COLLAPSED_ITEMS;
  const isShowingAll = shouldShowViewAll && isExpanded;

  const visibleServiceTypes = useMemo(
    () =>
      isShowingAll || !shouldShowViewAll
        ? serviceTypes
        : serviceTypes.slice(0, MAX_COLLAPSED_ITEMS),
    [serviceTypes, isShowingAll, shouldShowViewAll],
  );

  const popularServices = useMemo(
    () => popularServicesRes?.data?.data?.services || [],
    [popularServicesRes?.data?.data?.services],
  );

  const todayPromotions = useMemo(
    () => todayPromotionsRes?.data?.data?.services || [],
    [todayPromotionsRes?.data?.data?.services],
  );

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const formatVnd = (price?: number) => {
    const safePrice =
      typeof price === "number" && Number.isFinite(price)
        ? Math.max(0, price)
        : 0;

    return `${priceFormatter.format(Math.round(safePrice))} VND`;
  };

  const formatPublishedDate = (value?: string | null) => {
    return formatFriendlyPublishedAt(value, {
      locale,
      unknownLabel: tLatestNews("unknownDate"),
      justNowLabel: tLatestNews("justNow"),
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-24">
      <Header searchValue={searchValue} onSearchChange={setSearchValue} />

      {isSearching ? (
        <section className="p-4">
          <h2 className="mb-5 text-lg font-bold text-[#111827]">
            {tCollections("fallbackTitle")}
          </h2>

          {isSearchedServicesFetching ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="w-[160px] justify-self-center">
                  <div className="h-36 w-full animate-pulse rounded-xl bg-[#efe9ff]" />
                  <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-[#efe9ff]" />
                  <div className="mt-1 h-4 w-1/2 animate-pulse rounded-md bg-[#efe9ff]" />
                </div>
              ))}
            </div>
          ) : searchedServices.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {searchedServices.map((service) => {
                const thumbnailUrl = getServiceThumbnailUrl(service);
                const serviceSlug = (service.slug || service.id || "").trim();
                const hasSlug = serviceSlug.length > 0;
                const href = hasSlug ? `/products/${serviceSlug}` : "/home";
                const discountSource = toDiscountSource(service);
                const discountedPrice = getServiceDiscountedPrice(
                  service.price,
                  discountSource,
                );
                const hasActiveDiscount =
                  isServiceDiscountActive(discountSource) &&
                  typeof discountedPrice === "number" &&
                  discountedPrice < service.price;

                const discountBadgeLabel =
                  hasActiveDiscount &&
                  discountSource.discount_type === "percent" &&
                  typeof discountSource.discount_value === "number"
                    ? `-${Math.max(1, Math.round(discountSource.discount_value))}%`
                    : hasActiveDiscount &&
                        discountSource.discount_type === "amount" &&
                        typeof discountSource.discount_value === "number"
                      ? `-${formatVnd(
                          Math.round(discountSource.discount_value),
                        )}`
                      : null;

                return (
                  <Link
                    key={service.id}
                    href={href}
                    className={`block w-[160px] justify-self-center ${
                      hasSlug ? "cursor-pointer" : "pointer-events-none"
                    }`}
                    aria-disabled={!hasSlug}
                  >
                    <article className="w-[160px] justify-self-center">
                      <div className="relative h-36 w-full overflow-hidden rounded-xl bg-[#efe9ff]">
                        {thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt={service.name || "service-image"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}

                        {discountBadgeLabel ? (
                          <span className="absolute left-2 top-2 bg-[#ef4444] px-1 py-0.5 text-xs font-bold text-white">
                            {discountBadgeLabel}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 truncate text-center text-base font-semibold text-[#1f2937]">
                        {service.name}
                      </p>

                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-[#ef4444]">
                          {formatVnd(
                            hasActiveDiscount &&
                              typeof discountedPrice === "number"
                              ? discountedPrice
                              : service.price,
                          )}
                        </span>

                        {hasActiveDiscount ? (
                          <span className="text-[10px] text-[#9ca3af] line-through decoration-[#ef4444]">
                            {formatVnd(service.price)}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
              {tCollections("empty")}
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="px-4 pb-4 pt-4">
            <h2 className="mb-5 text-lg font-bold text-[#111827]">
              {tLatestNews("title")}
            </h2>

            {isLatestNewsFetching ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-[220px] shrink-0 rounded-2xl bg-[#faf7ff] p-2.5"
                  >
                    <div className="h-36 w-full animate-pulse rounded-3xl bg-[#efe9ff]" />
                    <div className="mt-3 h-5 w-5/6 animate-pulse rounded-md bg-[#efe9ff]" />
                    <div className="mt-2 h-4 w-2/3 animate-pulse rounded-md bg-[#efe9ff]" />
                    <div className="mt-2 h-4 w-full animate-pulse rounded-md bg-[#f3ecff]" />
                    <div className="mt-1 h-4 w-4/5 animate-pulse rounded-md bg-[#f3ecff]" />
                  </div>
                ))}
              </div>
            ) : latestNews.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {latestNews.map((news) => {
                  const thumbnailUrl = getNewsThumbnailUrl(news);
                  const newsSlug = (news.slug || news.id || "").trim();
                  const hasSlug = newsSlug.length > 0;
                  const href = hasSlug ? `/news/${newsSlug}` : "/home";

                  return (
                    <Link
                      key={news.id}
                      href={href}
                      className={`block w-[220px] shrink-0 ${
                        hasSlug ? "cursor-pointer" : "pointer-events-none"
                      }`}
                      aria-disabled={!hasSlug}
                    >
                      <article className="w-[220px] shrink-0 rounded-2xl bg-[#faf7ff] p-2.5">
                        <div className="relative h-36 w-full overflow-hidden rounded-3xl bg-[#efe9ff]">
                          {thumbnailUrl ? (
                            <Image
                              src={thumbnailUrl}
                              alt={news.title || "news-image"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>

                        <p className="mt-3 line-clamp-1 text-base font-semibold text-[#1f2937]">
                          {news.title || tLatestNews("fallbackTitle")}
                        </p>
                        <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-[#6b7280]">
                          {news.excerpt?.trim() || tLatestNews("excerptEmpty")}
                        </p>
                        <p className="mt-2 text-right text-[11px] font-medium text-[#8b5cf6]">
                          {formatPublishedDate(news.published_at)}
                        </p>
                      </article>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
                {tLatestNews("empty")}
              </p>
            )}
          </section>

          <section className="p-4">
            <h2 className="mb-5 text-lg font-bold text-[#111827]">
              {tServiceTypes("title")}
            </h2>

            {isServiceTypesFetching ? (
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                {Array.from({ length: MAX_COLLAPSED_ITEMS }).map((_, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-[#efe9ff] sm:h-20 sm:w-20" />
                    <div className="mt-3 h-4 w-16 animate-pulse rounded-md bg-[#f3ecff] sm:w-20" />
                  </div>
                ))}
              </div>
            ) : visibleServiceTypes.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                  {visibleServiceTypes.map((serviceType) => {
                    const Icon = getServiceTypeIconComponent(serviceType.icon);
                    const serviceTypeSlug = serviceType.slug?.trim() || "";
                    const hasSlug = serviceTypeSlug.length > 0;
                    const href = hasSlug
                      ? `/collections/${serviceTypeSlug}`
                      : "/home";

                    return (
                      <Link
                        key={serviceType.id}
                        href={href}
                        className={`flex flex-col items-center ${
                          hasSlug ? "cursor-pointer" : "pointer-events-none"
                        }`}
                        aria-disabled={!hasSlug}
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#efe9ff] text-[#8b5cf6] sm:h-20 sm:w-20">
                          <Icon className="h-7 w-7 sm:h-9 sm:w-9" />
                        </div>
                        <p className="mt-2 text-center text-base font-medium text-[#111827] sm:mt-3">
                          {serviceType.name}
                        </p>
                      </Link>
                    );
                  })}
                </div>

                {shouldShowViewAll ? (
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="mx-auto mt-4 flex items-center justify-center gap-1 text-sm text-[#8b5cf6]"
                  >
                    {isShowingAll
                      ? tServiceTypes("collapse")
                      : tServiceTypes("viewAll")}
                    {isShowingAll ? (
                      <FiChevronUp className="h-4 w-4" />
                    ) : (
                      <FiChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
                {tServiceTypes("empty")}
              </p>
            )}
          </section>

          <section className="px-4 pb-4">
            <h2 className="mb-5 text-lg font-bold text-[#111827]">
              {tPopularServices("title")}
            </h2>

            {isPopularServicesFetching ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-[220px] shrink-0 rounded-2xl bg-[#faf7ff] p-2.5"
                  >
                    <div className="h-36 w-full animate-pulse rounded-3xl bg-[#efe9ff]" />
                    <div className="mt-3 h-5 w-3/4 animate-pulse rounded-md bg-[#efe9ff]" />
                    <div className="mt-2 h-5 w-1/2 animate-pulse rounded-md bg-[#efe9ff]" />
                  </div>
                ))}
              </div>
            ) : popularServices.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {popularServices.map((service) => {
                  const thumbnailUrl = getServiceThumbnailUrl(service);
                  const serviceSlug = (service.slug || service.id || "").trim();
                  const hasSlug = serviceSlug.length > 0;
                  const href = hasSlug ? `/products/${serviceSlug}` : "/home";
                  const discountSource = toDiscountSource(service);
                  const discountedPrice = getServiceDiscountedPrice(
                    service.price,
                    discountSource,
                  );
                  const hasActiveDiscount =
                    isServiceDiscountActive(discountSource) &&
                    typeof discountedPrice === "number" &&
                    discountedPrice < service.price;

                  const discountBadgeLabel =
                    hasActiveDiscount &&
                    discountSource.discount_type === "percent" &&
                    typeof discountSource.discount_value === "number"
                      ? `-${Math.max(1, Math.round(discountSource.discount_value))}%`
                      : hasActiveDiscount &&
                          discountSource.discount_type === "amount" &&
                          typeof discountSource.discount_value === "number"
                        ? `-${formatVnd(
                            Math.round(discountSource.discount_value),
                          )}`
                        : null;

                  return (
                    <Link
                      key={service.id}
                      href={href}
                      className={`block w-[160px] shrink-0 ${
                        hasSlug ? "cursor-pointer" : "pointer-events-none"
                      }`}
                      aria-disabled={!hasSlug}
                    >
                      <article className="w-[160px] shrink-0">
                        <div className="relative h-36 w-full overflow-hidden rounded-xl bg-[#efe9ff]">
                          {thumbnailUrl ? (
                            <Image
                              src={thumbnailUrl}
                              alt={service.name || "service-image"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}

                          {discountBadgeLabel ? (
                            <span className="absolute left-2 top-2 bg-[#ef4444] px-1 py-0.5 text-xs font-bold text-white">
                              {discountBadgeLabel}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 truncate text-center text-base font-semibold text-[#1f2937]">
                          {service.name}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-[#ef4444]">
                            {formatVnd(
                              hasActiveDiscount &&
                                typeof discountedPrice === "number"
                                ? discountedPrice
                                : service.price,
                            )}
                          </span>

                          {hasActiveDiscount ? (
                            <span className="text-[10px] text-[#9ca3af] line-through decoration-[#ef4444]">
                              {formatVnd(service.price)}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
                {tPopularServices("empty")}
              </p>
            )}
          </section>

          <section className="px-4 pb-4">
            <h2 className="mb-5 text-lg font-bold text-[#111827]">
              {tTodayPromotions("title")}
            </h2>

            {isTodayPromotionsFetching ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-[220px] shrink-0 rounded-2xl bg-[#faf7ff] p-2.5"
                  >
                    <div className="h-36 w-full animate-pulse rounded-3xl bg-[#efe9ff]" />
                    <div className="mt-3 h-5 w-3/4 animate-pulse rounded-md bg-[#efe9ff]" />
                    <div className="mt-2 h-5 w-1/2 animate-pulse rounded-md bg-[#efe9ff]" />
                  </div>
                ))}
              </div>
            ) : todayPromotions.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {todayPromotions.map((service) => {
                  const thumbnailUrl = getServiceThumbnailUrl(service);
                  const serviceSlug = (service.slug || service.id || "").trim();
                  const hasSlug = serviceSlug.length > 0;
                  const href = hasSlug ? `/products/${serviceSlug}` : "/home";
                  const discountSource = toDiscountSource(service);
                  const discountedPrice = getServiceDiscountedPrice(
                    service.price,
                    discountSource,
                  );
                  const hasActiveDiscount =
                    isServiceDiscountActive(discountSource) &&
                    typeof discountedPrice === "number" &&
                    discountedPrice < service.price;

                  const discountBadgeLabel =
                    hasActiveDiscount &&
                    discountSource.discount_type === "percent" &&
                    typeof discountSource.discount_value === "number"
                      ? `-${Math.max(1, Math.round(discountSource.discount_value))}%`
                      : hasActiveDiscount &&
                          discountSource.discount_type === "amount" &&
                          typeof discountSource.discount_value === "number"
                        ? `-${formatVnd(
                            Math.round(discountSource.discount_value),
                          )}`
                        : null;

                  return (
                    <Link
                      key={service.id}
                      href={href}
                      className={`block w-[160px] shrink-0 ${
                        hasSlug ? "cursor-pointer" : "pointer-events-none"
                      }`}
                      aria-disabled={!hasSlug}
                    >
                      <article className="w-[160px] shrink-0">
                        <div className="relative h-36 w-full overflow-hidden rounded-xl bg-[#efe9ff]">
                          {thumbnailUrl ? (
                            <Image
                              src={thumbnailUrl}
                              alt={service.name || "service-image"}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}

                          {discountBadgeLabel ? (
                            <span className="absolute left-2 top-2 bg-[#ef4444] px-1 py-0.5 text-xs font-bold text-white">
                              {discountBadgeLabel}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 truncate text-center text-base font-semibold text-[#1f2937]">
                          {service.name}
                        </p>

                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-bold text-[#ef4444]">
                            {formatVnd(
                              hasActiveDiscount &&
                                typeof discountedPrice === "number"
                                ? discountedPrice
                                : service.price,
                            )}
                          </span>

                          {hasActiveDiscount ? (
                            <span className="text-[10px] text-[#9ca3af] line-through decoration-[#ef4444]">
                              {formatVnd(service.price)}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
                {tTodayPromotions("empty")}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
