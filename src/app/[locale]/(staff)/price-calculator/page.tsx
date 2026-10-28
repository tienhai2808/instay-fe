"use client";

import { calculateRoomTypePrice, getRoomTypes } from "@/apis/room_type";
import { LOCALE_VI } from "@/constants/locale";
import { queryKeys } from "@/constants/query-keys";
import { useMessage } from "@/providers/MessageProvider";
import type { CalculateRoomTypePriceRequest } from "@/types/request/room_type";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DatePicker, Empty, InputNumber, Spin } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { FiHome, FiStar, FiSun, FiUsers } from "react-icons/fi";
import type { IconType } from "react-icons";

interface CalculationResult {
  totalDays: number;
  totalPrice: number;
  averagePrice: number;
}

type DateRangeValue = [Dayjs | null, Dayjs | null] | null;

const toUtcDayStartString = (value: Dayjs) =>
  `${value.format("YYYY-MM-DD")}T00:00:00Z`;

const resolveRoomTypeIcon = (name?: string): IconType => {
  const normalized = (name || "").trim().toLocaleLowerCase();

  if (
    normalized.includes("family") ||
    normalized.includes("twin") ||
    normalized.includes("double") ||
    normalized.includes("group")
  ) {
    return FiUsers;
  }

  if (normalized.includes("suite")) return FiStar;
  if (normalized.includes("deluxe") || normalized.includes("premium")) {
    return FiSun;
  }

  return FiHome;
};

const createDefaultDateRange = (): DateRangeValue => {
  const today = dayjs().startOf("day");
  return [today, today.add(1, "day")];
};

const toSafePositiveInteger = (value: unknown, fallback = 1) => {
  const parsed =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
};

export default function PriceCalculatorPage() {
  const t = useTranslations("PriceCalculatorPage");
  const locale = useLocale();
  const messageApi = useMessage();

  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState("");
  const [selectedRange, setSelectedRange] = useState<DateRangeValue>(
    createDefaultDateRange,
  );
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [calculationError, setCalculationError] = useState(false);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const {
    data: roomTypesRes,
    isFetching: loadingRoomTypes,
    error: roomTypesError,
  } = useQuery({
    queryKey: queryKeys.roomTypes.basic(),
    queryFn: async () => getRoomTypes({ view: "basic" }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!roomTypesError) return;
    messageApi.errorFromApi(roomTypesError);
  }, [messageApi, roomTypesError]);

  const roomTypes = useMemo(
    () => roomTypesRes?.data?.data?.room_types || [],
    [roomTypesRes?.data?.data?.room_types],
  );

  const selectedRoomType = useMemo(
    () => roomTypes.find((roomType) => roomType.id === selectedRoomTypeId),
    [roomTypes, selectedRoomTypeId],
  );

  const calculateMutation = useMutation({
    mutationFn: async (payload: CalculateRoomTypePriceRequest) =>
      calculateRoomTypePrice(payload),
  });

  const formatCurrency = (value: number) =>
    `${numberFormatter.format(value)} VND`;

  const handleCalculate = async () => {
    const fromDate = selectedRange?.[0];
    const toDate = selectedRange?.[1];
    const normalizedQuantity = toSafePositiveInteger(quantity, 0);

    if (!roomTypes.length) {
      messageApi.error(t("states.noRoomTypes"));
      return;
    }

    if (!selectedRoomTypeId.trim()) {
      messageApi.error(t("states.selectRoomType"));
      return;
    }

    if (!fromDate || !toDate) {
      messageApi.error(t("states.selectDateRange"));
      return;
    }

    if (!toDate.isAfter(fromDate, "day")) {
      messageApi.error(t("states.invalidDateRange"));
      return;
    }

    if (normalizedQuantity < 1) {
      messageApi.error(t("states.invalidQuantity"));
      return;
    }

    setCalculationError(false);

    const payload: CalculateRoomTypePriceRequest = {
      room_type_id: selectedRoomTypeId.trim(),
      from_date: toUtcDayStartString(fromDate),
      to_date: toUtcDayStartString(toDate),
      quantity: normalizedQuantity,
    };

    try {
      const res = await calculateMutation.mutateAsync(payload);
      const totalDays = Number(res.data.data?.price?.total_days);
      const totalPrice = Number(res.data.data?.price?.total_price);
      const averagePrice = Number(res.data.data?.price?.average_price);

      setResult({
        totalDays: Number.isFinite(totalDays)
          ? Math.max(0, Math.round(totalDays))
          : 0,
        totalPrice: Number.isFinite(totalPrice)
          ? Math.max(0, Math.round(totalPrice))
          : 0,
        averagePrice: Number.isFinite(averagePrice)
          ? Math.max(0, Math.round(averagePrice))
          : 0,
      });
    } catch (error) {
      setResult(null);
      setCalculationError(true);
      messageApi.errorFromApi(error);
    }
  };

  return (
    <div className="mx-auto min-h-full flex items-center max-w-[1120px]">
      <section className="overflow-hidden rounded-[28px] border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_36px_rgba(10,10,10,0.08)] sm:p-6">
        <div className="mb-5 sm:mb-6">
          <span className="inline-flex rounded-full border border-[#8b5cf6] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#7c3aed]">
            {t("badge")}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
          <div className="rounded-2xl border border-[#8b5cf6] bg-white p-5 text-[#171717] shadow-[0_16px_32px_rgba(10,10,10,0.08)] sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5cf6]">
                {t("labels.screen")}
              </p>
              <p className="text-xs text-[#52525b]">
                {selectedRoomType?.name || "-"}
              </p>
            </div>

            {calculateMutation.isPending ? (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8b5cf6]">
                  {t("states.loading")}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="h-20 animate-pulse rounded-xl border border-[#ddd6fe] bg-[#faf5ff]" />
                  <div className="h-20 animate-pulse rounded-xl border border-[#ddd6fe] bg-[#faf5ff]" />
                  <div className="h-20 animate-pulse rounded-xl border border-[#ddd6fe] bg-[#faf5ff]" />
                </div>
              </div>
            ) : calculationError ? (
              <div className="mt-5 min-h-[164px] rounded-xl border border-[#ddd6fe] bg-[#faf5ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5cf6]">
                  {t("states.errorTitle")}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#171717] sm:text-xl">
                  {t("states.errorHint")}
                </p>
              </div>
            ) : result ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#8b5cf6] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[#7c3aed]">
                    {t("result.days")}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#0a0a0a] sm:text-4xl">
                    {numberFormatter.format(result.totalDays)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#8b5cf6] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[#7c3aed]">
                    {t("result.total")}
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-tight text-[#0a0a0a] sm:text-xl">
                    {formatCurrency(result.totalPrice)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#8b5cf6] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.1em] text-[#7c3aed]">
                    {t("result.average")}
                  </p>
                  <p className="mt-2 text-lg font-semibold leading-tight text-[#0a0a0a] sm:text-xl">
                    {formatCurrency(result.averagePrice)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 min-h-[164px] rounded-xl border border-[#ddd6fe] bg-[#faf5ff] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b5cf6]">
                  {t("states.idleTitle")}
                </p>
                <p className="mt-2 text-lg font-semibold text-[#171717] sm:text-xl">
                  {t("states.idleHint")}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-[#52525b]">{t("result.flash")}</p>
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,10,0.08)] sm:p-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717]">
                {t("labels.dateRange")}
              </p>
              <DatePicker.RangePicker
                value={selectedRange}
                onChange={(value) => {
                  setSelectedRange(value ?? null);
                }}
                format="DD/MM/YYYY"
                inputReadOnly
                allowEmpty={[false, false]}
                placeholder={[
                  t("placeholders.fromDate"),
                  t("placeholders.toDate"),
                ]}
                className="w-full rounded-lg! border-[#d4d4d8]! px-2 py-1.5 [&_.ant-picker-input>input]:font-medium [&_.ant-picker-input>input]:text-[#171717] [&_.ant-picker-suffix]:text-[#8b5cf6] [&.ant-picker-focused]:border-[#8b5cf6]!"
              />
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717]">
                {t("labels.quantity")}
              </p>
              <InputNumber
                min={1}
                step={1}
                precision={0}
                value={quantity}
                onChange={(value) => {
                  setQuantity(toSafePositiveInteger(value, 1));
                }}
                placeholder={t("placeholders.quantity")}
                controls
                className="w-full rounded-lg! border-[#d4d4d8]! [&_.ant-input-number-input]:text-[#171717] [&.ant-input-number-focused]:border-[#8b5cf6]!"
              />
            </div>

            <div className="mt-4 rounded-lg border border-dashed border-[#8b5cf6] bg-white px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#7c3aed]">
                {t("labels.selectedRoom")}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-[#171717]">
                {selectedRoomType?.name || "-"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleCalculate();
              }}
              disabled={calculateMutation.isPending || !roomTypes.length}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[#0a0a0a] bg-[#0a0a0a] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#262626] active:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calculateMutation.isPending
                ? t("actions.calculating")
                : t("actions.calculate")}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-[0_1px_2px_rgba(10,10,10,0.08)] sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#171717]">
            {t("labels.roomTypes")}
          </p>
          <Spin spinning={loadingRoomTypes}>
            {roomTypes.length ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {roomTypes.map((roomType) => {
                  const isSelected = selectedRoomTypeId === roomType.id;
                  const Icon = resolveRoomTypeIcon(roomType.name);

                  return (
                    <button
                      key={roomType.id}
                      type="button"
                      onClick={() => setSelectedRoomTypeId(roomType.id)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-[#8b5cf6] bg-[#faf5ff] shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
                          : "border-[#e5e7eb] bg-white hover:border-[#8b5cf6]"
                      }`}
                    >
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-base ${
                          isSelected
                            ? "border-[#c4b5fd] bg-white text-[#7c3aed]"
                            : "border-[#e5e7eb] bg-white text-[#171717]"
                        }`}
                      >
                        <Icon />
                      </span>
                      <span className="mt-2 block truncate text-sm font-semibold text-[#171717]">
                        {roomType.name?.trim() || `#${roomType.id}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3">
                <Empty description={t("states.noRoomTypes")} />
              </div>
            )}
          </Spin>
        </div>
      </section>
    </div>
  );
}
