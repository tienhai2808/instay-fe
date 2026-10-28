"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty, Pagination, Spin } from "antd";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getReviewsForAdmin, getReviewsSummaryForAdmin } from "@/apis/review";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type {
  GetReviewsForAdminRequest,
  GetReviewsSummaryForAdminRequest,
  ReviewSortOrder,
} from "@/types/request/review";
import type { ReviewsResponseData } from "@/types/response/review";
import ReviewsFilter, { type ReviewsDateRange } from "./components/Filter";
import ReviewListCard from "./components/ListCard";
import ReviewSummaryCard from "./components/SummaryCard";

type ReviewStarValue = 1 | 2 | 3 | 4 | 5;

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
};

const toNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
};

const normalizeReviewsResponse = (
  payload: ReviewsResponseData | null | undefined,
  fallbackPage: number,
  fallbackLimit: number,
) => {
  const reviews = payload?.reviews || [];
  const pagination = payload?.meta || payload?.pagination;

  const page = toPositiveNumber(pagination?.page) ?? fallbackPage;
  const limit = toPositiveNumber(pagination?.limit) ?? fallbackLimit;
  const totalFromApi = toNonNegativeNumber(pagination?.total);
  const totalPagesFromApi = toPositiveNumber(pagination?.total_pages);

  const estimatedTotalFromData = Math.max(
    (page - 1) * limit + reviews.length,
    reviews.length,
  );
  const total = totalFromApi ?? estimatedTotalFromData;
  const totalPages =
    totalPagesFromApi ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const hasPrev = pagination?.has_prev ?? page > 1;
  const hasNext = pagination?.has_next ?? page < totalPages;

  return {
    reviews,
    page,
    limit,
    total,
    totalPages,
    hasPrev,
    hasNext,
  };
};

export default function ReviewsPage() {
  const t = useTranslations("ReviewsPage");
  const messageApi = useMessage();

  const [dateRangeValue, setDateRangeValue] = useState<ReviewsDateRange>(null);
  const [order, setOrder] = useState<ReviewSortOrder>("desc");
  const [star, setStar] = useState<ReviewStarValue | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fromDate = dateRangeValue?.[0]?.format("YYYY-MM-DD");
  const toDate = dateRangeValue?.[1]?.format("YYYY-MM-DD");

  const reviewsQueryParams = useMemo<GetReviewsForAdminRequest>(
    () => ({
      page,
      limit,
      sort: "created_at",
      order,
      star,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    [fromDate, limit, order, page, star, toDate],
  );

  const reviewsSummaryQueryParams = useMemo<GetReviewsSummaryForAdminRequest>(
    () => ({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    }),
    [fromDate, toDate],
  );

  const {
    data: reviewsRes,
    isFetching: isReviewsFetching,
    error: reviewsError,
  } = useQuery({
    queryKey: queryKeys.reviews.list(reviewsQueryParams),
    queryFn: async () => getReviewsForAdmin(reviewsQueryParams),
    placeholderData: (previousData) => previousData,
  });

  const {
    data: reviewsSummaryRes,
    isFetching: isReviewsSummaryFetching,
    error: reviewsSummaryError,
  } = useQuery({
    queryKey: queryKeys.reviews.summary(reviewsSummaryQueryParams),
    queryFn: async () => getReviewsSummaryForAdmin(reviewsSummaryQueryParams),
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (reviewsError) {
      messageApi.errorFromApi(reviewsError);
    }
  }, [messageApi, reviewsError]);

  useEffect(() => {
    if (reviewsSummaryError) {
      messageApi.errorFromApi(reviewsSummaryError);
    }
  }, [messageApi, reviewsSummaryError]);

  const normalized = useMemo(
    () => normalizeReviewsResponse(reviewsRes?.data?.data, page, limit),
    [limit, page, reviewsRes?.data?.data],
  );

  const reviews = normalized.reviews;
  const loading = isReviewsFetching;
  const summary = reviewsSummaryRes?.data?.data?.summary ?? null;

  const handleDateRangeChange = (value: ReviewsDateRange) => {
    const prevFrom = dateRangeValue?.[0]?.format("YYYY-MM-DD");
    const prevTo = dateRangeValue?.[1]?.format("YYYY-MM-DD");
    const nextFrom = value?.[0]?.format("YYYY-MM-DD");
    const nextTo = value?.[1]?.format("YYYY-MM-DD");
    if (prevFrom === nextFrom && prevTo === nextTo) return;

    setPage(1);
    setDateRangeValue(value);
  };

  const handleOrderChange = (value: ReviewSortOrder) => {
    if (value === order) return;
    setPage(1);
    setOrder(value);
  };

  const handleStarToggle = (selectedStar: number) => {
    setPage(1);
    setStar((prev) =>
      prev === selectedStar ? undefined : (selectedStar as ReviewStarValue),
    );
  };

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    if (nextPageSize !== limit) {
      setLimit(nextPageSize);
      setPage(1);
      return;
    }

    if (nextPage > normalized.page && !normalized.hasNext) return;
    if (nextPage < normalized.page && !normalized.hasPrev) return;
    setPage(nextPage);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="mb-6 flex flex-col gap-4 text-black sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl mb-1 font-bold">{t("title")}</h1>
          <p className="text-sm font-light">{t("subtitle")}</p>
        </div>
      </div>

      <div className="rounded-sm bg-[#f5f5f5] px-3 py-3 sm:px-4 lg:px-6">
        <ReviewsFilter
          loading={loading}
          dateRangeValue={dateRangeValue}
          orderValue={order}
          onDateRangeChange={handleDateRangeChange}
          onOrderChange={handleOrderChange}
          labels={{
            datePlaceholders: [t("filters.fromDate"), t("filters.toDate")],
            orderPlaceholder: t("filters.order"),
            newestFirst: t("sort.newestFirst"),
            oldestFirst: t("sort.oldestFirst"),
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 lg:order-1">
          <Spin spinning={loading} size="large">
            {reviews.length === 0 && !loading ? (
              <div className="min-h-[260px] w-full flex items-center justify-center">
                <Empty description={t("empty")} />
              </div>
            ) : (
              <div className="rounded-sm bg-[#f5f5f5] p-3 shadow-sm">
                <div className="flex flex-col gap-3">
                  {reviews.map((review) => (
                    <ReviewListCard
                      key={review.id}
                      review={review}
                      labels={{
                        roomPrefix: t("card.roomPrefix"),
                        unknownGuest: t("card.unknownGuest"),
                        unknownDate: t("card.unknownDate"),
                        emptyContent: t("card.emptyContent"),
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </Spin>

          {normalized.total > 0 ? (
            <div className="mt-6 flex justify-end pb-8">
              <Pagination
                current={normalized.page}
                pageSize={normalized.limit}
                total={normalized.total}
                onChange={handlePaginationChange}
                onShowSizeChange={(_, nextSize) => {
                  handlePaginationChange(1, nextSize);
                }}
                showSizeChanger
                hideOnSinglePage={false}
                pageSizeOptions={[10, 20, 50, 100]}
                showTotal={(total, range) =>
                  t("pagination", {
                    from: range[0],
                    to: range[1],
                    total,
                  })
                }
                className="[&_.ant-pagination-item-active]:!border-[#8b5cf6] [&_.ant-pagination-item-active]:!bg-[#8b5cf6] [&_.ant-pagination-item-active>a]:!text-white"
              />
            </div>
          ) : null}
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-4">
          <ReviewSummaryCard
            summary={summary}
            loading={isReviewsSummaryFetching}
            selectedStar={star}
            onStarToggle={handleStarToggle}
            labels={{
              starLabel: ({ star }) => t("summary.starLabel", { star }),
              totalReviews: ({ count }) => t("summary.totalReviews", { count }),
            }}
          />
        </div>
      </div>
    </div>
  );
}
