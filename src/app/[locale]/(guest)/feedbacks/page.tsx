"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Carousel, Empty, Input, Rate } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  createReviewForGuest,
  getMyReviewForGuest,
  getReviewsForGuest,
  updateMyReviewForGuest,
} from "@/apis/review";
import { useMessage } from "@/providers/MessageProvider";
import type { GuestReview } from "@/types/data/review";

type FeedbackFormErrors = {
  star?: string;
  content?: string;
};

const MAX_REVIEWS = 10;

const formatReviewDate = (value?: string, locale?: string) => {
  if (!value) return "-";

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";

  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";
  return parsedDate.toLocaleDateString(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export default function FeedbacksPage() {
  const locale = useLocale();
  const t = useTranslations("FeedbacksPage");
  const messageApi = useMessage();
  const queryClient = useQueryClient();
  const carouselRef = useRef<CarouselRef>(null);

  const [draftStar, setDraftStar] = useState<number | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [errors, setErrors] = useState<FeedbackFormErrors>({});

  const {
    data: reviewsRes,
    error: reviewsError,
    isFetching: isReviewsFetching,
  } = useQuery({
    queryKey: ["guest", "reviews", MAX_REVIEWS],
    queryFn: async () => getReviewsForGuest({ limit: MAX_REVIEWS }),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!reviewsError) return;
    messageApi.errorFromApi(reviewsError);
  }, [messageApi, reviewsError]);

  const { data: myReviewRes, error: myReviewError } = useQuery({
    queryKey: ["guest", "reviews", "me"],
    queryFn: async () => getMyReviewForGuest(),
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!myReviewError) return;
    messageApi.errorFromApi(myReviewError);
  }, [messageApi, myReviewError]);

  const myReview = useMemo(() => {
    const payload = myReviewRes?.data?.data;
    if (!payload) return null;

    const reviewRecord = payload as { review?: GuestReview | null };
    if (reviewRecord.review) return reviewRecord.review;

    const directReview = payload as GuestReview;
    return directReview?.id ? directReview : null;
  }, [myReviewRes?.data?.data]);

  const initialStar = Math.max(0, Math.min(5, Number(myReview?.star) || 0));
  const initialContent = (myReview?.content || "").trim();
  const star = draftStar ?? initialStar;
  const content = draftContent ?? (myReview?.content || "");

  const createReviewMutation = useMutation({
    mutationFn: createReviewForGuest,
    onSuccess: () => {
      messageApi.success(t("submitSuccess"));
      setDraftStar(null);
      setDraftContent(null);
      setErrors({});
      void queryClient.invalidateQueries({ queryKey: ["guest", "reviews"] });
      void queryClient.invalidateQueries({
        queryKey: ["guest", "reviews", "me"],
      });
    },
    onError: (createError) => {
      messageApi.errorFromApi(createError);
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: updateMyReviewForGuest,
    onSuccess: () => {
      messageApi.success(t("updateSuccess"));
      setDraftStar(null);
      setDraftContent(null);
      setErrors({});
      void queryClient.invalidateQueries({ queryKey: ["guest", "reviews"] });
      void queryClient.invalidateQueries({
        queryKey: ["guest", "reviews", "me"],
      });
    },
    onError: (updateError) => {
      messageApi.errorFromApi(updateError);
    },
  });

  const reviews = useMemo(() => {
    const list = reviewsRes?.data?.data?.reviews || [];

    return [...list]
      .sort((left, right) => {
        const leftMs = left.created_at
          ? new Date(left.created_at).getTime()
          : 0;
        const rightMs = right.created_at
          ? new Date(right.created_at).getTime()
          : 0;
        return rightMs - leftMs;
      })
      .slice(0, MAX_REVIEWS);
  }, [reviewsRes?.data?.data?.reviews]);

  const hasMyReview = Boolean(myReview?.id);
  const normalizedContent = content.trim();
  const isFormComplete = star > 0 && normalizedContent.length > 0;
  const isDirty = star !== initialStar || normalizedContent !== initialContent;
  const isSubmitLoading =
    createReviewMutation.isPending || updateReviewMutation.isPending;

  const validateForm = () => {
    const nextErrors: FeedbackFormErrors = {};

    if (!star) {
      nextErrors.star = t("errors.starRequired");
    }

    if (!content.trim()) {
      nextErrors.content = t("errors.contentRequired");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (hasMyReview) {
      if (!isDirty) return;
      await updateReviewMutation.mutateAsync({
        star,
        content: normalizedContent,
      });
      return;
    }

    await createReviewMutation.mutateAsync({
      star,
      content: normalizedContent,
    });
  };

  const submitButtonClassName = !isFormComplete
    ? "!border-[#6b7280] !bg-[#6b7280]"
    : hasMyReview && !isDirty
      ? "!border-[#c4b5fd] !bg-[#c4b5fd]"
      : "!border-[#8b5cf6] !bg-[#8b5cf6]";

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col pb-24">
      <section className="p-4 pb-3">
        <h1 className="mt-4 text-xl font-bold text-[#111827]">{t("title")}</h1>

        <div className="mt-4">
          <h2 className="text-base font-bold text-[#2f2b27]">
            {t("featuredReviewsTitle")}
          </h2>

          <div className="relative mt-4">
            {isReviewsFetching ? (
              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <div className="h-6 w-2/3 animate-pulse rounded-md bg-[#f3f4f6]" />
                <div className="mt-3 h-6 w-40 animate-pulse rounded-md bg-[#f3f4f6]" />
                <div className="mt-4 space-y-2">
                  <div className="h-5 w-full animate-pulse rounded-md bg-[#f3f4f6]" />
                  <div className="h-5 w-full animate-pulse rounded-md bg-[#f3f4f6]" />
                  <div className="h-5 w-4/5 animate-pulse rounded-md bg-[#f3f4f6]" />
                </div>
              </div>
            ) : reviews.length > 0 ? (
              <div className="relative">
                {reviews.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => carouselRef.current?.prev()}
                      className="absolute -left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] shadow"
                      aria-label={t("actions.previous")}
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => carouselRef.current?.next()}
                      className="absolute -right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#f3f4f6] text-[#6b7280] shadow"
                      aria-label={t("actions.next")}
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}

                <Carousel
                  ref={carouselRef}
                  dots={reviews.length > 1}
                  infinite={reviews.length > 1}
                  draggable={reviews.length > 1}
                >
                  {reviews.map((review) => (
                    <div key={review.id}>
                      <article className="mx-1 rounded-md border border-[#e5e7eb] bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="truncate text-sm font-bold text-[#1f2937]">
                            {t("reviewAuthor", { id: review.id })}
                          </h3>
                          <span className="shrink-0 text-sm text-[#9ca3af]">
                            {formatReviewDate(review.created_at, locale)}
                          </span>
                        </div>

                        <Rate
                          disabled
                          value={Math.max(
                            0,
                            Math.min(5, Number(review.star) || 0),
                          )}
                          className="mt-2! !text-2xl"
                          style={{ color: "#10b981" }}
                        />

                        <p className="mt-2 min-h-[128px] whitespace-pre-line text-sm leading-8 text-[#1f2937]">
                          {review.content?.trim() || t("emptyContent")}
                        </p>
                      </article>
                    </div>
                  ))}
                </Carousel>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#e5e7eb] bg-white py-8">
                <Empty description={t("featuredReviewsEmpty")} />
              </div>
            )}
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
          <h2 className="text-center text-lg font-bold text-[#2f2b27]">
            {t("writeReviewTitle")}
          </h2>

          <div className="mt-2 flex justify-center">
            <Rate
              value={star}
              onChange={(nextStar) => {
                setDraftStar(nextStar);
                if (nextStar > 0) {
                  setErrors((prev) => ({ ...prev, star: undefined }));
                }
              }}
              className="text-4xl!"
              style={{ color: "#ffce00" }}
            />
          </div>

          {errors.star ? (
            <p className="mt-2 text-center text-xs text-[#ef4444]">
              {errors.star}
            </p>
          ) : null}

          <div className="mt-4">
            <Input.TextArea
              value={content}
              onChange={(event) => {
                setDraftContent(event.target.value);
                if (event.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, content: undefined }));
                }
              }}
              placeholder={t("contentPlaceholder")}
              autoSize={{ minRows: 5, maxRows: 8 }}
              className="!rounded-md !border-[#d1d5db] !bg-white !px-3 !py-3 !text-base !text-[#111827] placeholder:!text-[#9ca3af]"
              maxLength={1000}
            />

            {errors.content ? (
              <p className="mt-2 text-xs text-[#ef4444]">{errors.content}</p>
            ) : null}
          </div>

          <Button
            type="primary"
            block
            className={`mt-5 !h-10 !rounded-md !text-base !font-semibold ${submitButtonClassName}`}
            loading={isSubmitLoading}
            onClick={() => void handleSubmit()}
          >
            {isSubmitLoading ? t("submitting") : t("submit")}
          </Button>
        </section>
      </section>
    </div>
  );
}
