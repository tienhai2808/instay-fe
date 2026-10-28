"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createOrderServiceForGuest } from "@/apis/order_service";
import { getGuestServiceBySlug } from "@/apis/service";
import RichTextContent from "@/components/shared/ui/RichTextContent";
import { useMessage } from "@/providers/MessageProvider";
import type { Service, ServiceImage } from "@/types/data/service";
import { resolvePublicImageUrl } from "@/utils/media";
import {
  getServiceDiscountedPrice,
  isServiceDiscountActive,
  type ServiceDiscountSource,
} from "@/utils/service-discount";
import OrderServiceModal from "./components/Modal";

const toDiscountSource = (service?: Service | null): ServiceDiscountSource => ({
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

const compareServiceImages = (left: ServiceImage, right: ServiceImage) => {
  const leftOrder =
    typeof left.sort_order === "number"
      ? left.sort_order
      : Number.MAX_SAFE_INTEGER;
  const rightOrder =
    typeof right.sort_order === "number"
      ? right.sort_order
      : Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  if (left.is_thumbnail !== right.is_thumbnail) {
    return left.is_thumbnail ? -1 : 1;
  }

  const leftIdentity = left.key?.trim() || "";
  const rightIdentity = right.key?.trim() || "";

  return leftIdentity.localeCompare(rightIdentity);
};

export default function ProductDetailsPage() {
  const locale = useLocale();
  const t = useTranslations("ProductDetailsPage");
  const messageApi = useMessage();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const { data, error, isFetching } = useQuery({
    queryKey: ["guest", "services", "details", slug],
    queryFn: async () => getGuestServiceBySlug(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!error) return;
    messageApi.errorFromApi(error);
  }, [error, messageApi]);

  const createOrderServiceMutation = useMutation({
    mutationFn: createOrderServiceForGuest,
    onSuccess: () => {
      messageApi.success(t("orderCreatedSuccess"));
      setIsOrderModalOpen(false);
    },
    onError: (createError) => {
      messageApi.errorFromApi(createError);
    },
  });

  const service = data?.data?.data?.service;

  const images = useMemo(() => {
    const rawImages = service?.images || [];
    return [...rawImages].sort(compareServiceImages);
  }, [service?.images]);

  const discountSource = useMemo(() => toDiscountSource(service), [service]);

  const discountedPrice = useMemo(
    () => getServiceDiscountedPrice(service?.price, discountSource),
    [discountSource, service?.price],
  );

  const hasActiveDiscount =
    isServiceDiscountActive(discountSource) &&
    typeof discountedPrice === "number" &&
    typeof service?.price === "number" &&
    discountedPrice < service.price;

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

  const priceLabel =
    typeof service?.price === "number" ? formatVnd(service.price) : "-";

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col">
      <section className="p-4 pb-3">
        <h1 className="text-xl mt-4 font-bold text-[#111827]">
          {service?.name?.trim() || t("fallbackTitle")}
        </h1>
      </section>

      <section className="px-4 pb-4">
        {isFetching ? (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="w-[160px] shrink-0">
                <div className="h-36 w-full animate-pulse rounded-xl bg-[#efe9ff]" />
              </div>
            ))}
          </div>
        ) : images.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => {
              const imageUrl = resolvePublicImageUrl(image.key);
              const imageIdentity =
                image.key?.trim() || `service-image-${index + 1}`;
              return (
                <article key={imageIdentity} className="w-[160px] shrink-0">
                  <div className="relative h-36 w-full overflow-hidden rounded-xl bg-[#efe9ff]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={service?.name || "service-image"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl bg-[#faf5ff] px-3 py-2 text-center text-sm text-[#6b21a8]">
            {t("imageEmpty")}
          </p>
        )}
      </section>

      <section className="px-4 pb-4">
        <h3 className="text-base mt-4 font-bold text-[#111827]">
          {t("descriptionTitle")}
        </h3>
        <RichTextContent
          value={service?.description}
          emptyFallback={t("descriptionEmpty")}
          className="text-sm leading-6 text-[#374151]"
        />
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto w-full max-w-screen-sm px-4 pb-4">
          <section className="rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between text-sm font-semibold text-[#4b5563]">
              <span>{t("priceLabel")}</span>
              <span>{priceLabel}</span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[#4b5563]">
              <span>{t("promotionLabel")}</span>
              <span>
                {hasActiveDiscount && typeof discountedPrice === "number"
                  ? formatVnd(discountedPrice)
                  : t("promotionNone")}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              disabled={!service?.id}
              className="mt-4 h-10 w-full rounded-md bg-[#8b5cf6] text-base font-semibold text-white"
            >
              {t("bookService")}
            </button>
          </section>
        </div>
      </div>

      {isOrderModalOpen ? (
        <OrderServiceModal
          open={isOrderModalOpen}
          serviceId={service?.id}
          serviceName={service?.name}
          isSubmitting={createOrderServiceMutation.isPending}
          onClose={() => {
            if (createOrderServiceMutation.isPending) return;
            setIsOrderModalOpen(false);
          }}
          onSubmit={async (payload) => {
            await createOrderServiceMutation.mutateAsync(payload);
          }}
        />
      ) : null}
    </div>
  );
}
