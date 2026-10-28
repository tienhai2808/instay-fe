"use client";

import Image from "next/image";
import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getGuestServiceTypeServicesBySlug } from "@/apis/service_type";
import { Link } from "@/i18n/routing";
import { useMessage } from "@/providers/MessageProvider";
import { resolvePublicImageUrl } from "@/utils/media";
import {
  getServiceDiscountedPrice,
  isServiceDiscountActive,
  type ServiceDiscountSource,
} from "@/utils/service-discount";
import type { ServiceTypeService } from "@/types/data/service_type";

const toDiscountSource = (
  service?: ServiceTypeService | null,
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

const getServiceThumbnailUrl = (service?: ServiceTypeService | null) =>
  resolvePublicImageUrl(service?.thumbnail?.key || undefined);

export default function CollectionDetailsPage() {
  const locale = useLocale();
  const t = useTranslations("CollectionsPage");
  const messageApi = useMessage();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";

  const {
    data: serviceTypeServicesRes,
    error: serviceTypeServicesError,
    isFetching: isServiceTypeServicesFetching,
  } = useQuery({
    queryKey: ["guest", "service-types", "collections", slug],
    queryFn: async () => getGuestServiceTypeServicesBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!serviceTypeServicesError) return;
    messageApi.errorFromApi(serviceTypeServicesError);
  }, [messageApi, serviceTypeServicesError]);

  const serviceTypeName =
    serviceTypeServicesRes?.data?.data?.service_type?.name?.trim() ||
    t("fallbackTitle");

  const services = useMemo(
    () => serviceTypeServicesRes?.data?.data?.services || [],
    [serviceTypeServicesRes?.data?.data?.services],
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

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-24">
      <header className="flex h-[141px] items-center justify-center bg-[#8b5cf6] px-4 py-5">
        <h1 className="line-clamp-2 text-center text-2xl font-semibold text-white">
          {serviceTypeName}
        </h1>
      </header>

      <section className="p-4">
        {isServiceTypeServicesFetching ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="w-[160px] justify-self-center">
                <div className="h-36 w-full animate-pulse rounded-xl bg-[#efe9ff]" />
                <div className="mt-2 h-5 w-3/4 animate-pulse rounded-md bg-[#efe9ff]" />
                <div className="mt-1 h-4 w-1/2 animate-pulse rounded-md bg-[#efe9ff]" />
              </div>
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {services.map((service) => {
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
                    ? `-${formatVnd(Math.round(discountSource.discount_value))}`
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
            {t("empty")}
          </p>
        )}
      </section>
    </div>
  );
}
