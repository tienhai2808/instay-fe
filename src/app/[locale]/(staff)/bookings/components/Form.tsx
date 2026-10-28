"use client";

import { ReactNode, useEffect, useMemo, useRef } from "react";
import { DatePicker, Form, Input, InputNumber, Select } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useLocale, useTranslations } from "next-intl";
import { calculateRoomTypePrice } from "@/apis/room_type";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useMessage } from "@/providers/MessageProvider";
import type { Source } from "@/types/data/source";
import type { BookingStatus } from "@/types/request/booking";
import type { User } from "@/types/data/user";
import SourceSelect from "./SourceSelect";

export const OFFLINE_SOURCE_NAME = "Trực tiếp (Offline)";

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";
const branchSelectClassName = "branch-form-select";

const normalizeSourceName = (value?: string | null) =>
  (value || "").trim().toLocaleLowerCase();

export const isOfflineSourceName = (value?: string | null) =>
  normalizeSourceName(value) === normalizeSourceName(OFFLINE_SOURCE_NAME);

const normalizeOptionalString = (value?: string | null) => {
  const nextValue = value?.trim();
  return nextValue || undefined;
};

const CHECK_IN_DEFAULT_OPEN_TIME = dayjs().hour(14).minute(0).second(0);
const CHECK_OUT_DEFAULT_OPEN_TIME = dayjs().hour(12).minute(0).second(0);

const toUtcDayStartString = (value: Dayjs) =>
  `${value.format("YYYY-MM-DD")}T00:00:00Z`;

export interface RoomTypeOption {
  label: string;
  value: string;
}

export interface BranchOption {
  label: string;
  value: string;
}

export interface BookingGuestSegmentValue {
  count?: number | null;
  type?: string;
}

export interface BookingFormValues {
  booking_number?: string;
  guest_full_name: string;
  guest_email: string;
  guest_phone: string;
  check_in?: Dayjs;
  check_out?: Dayjs;
  branch_id?: string;
  room_type_id?: string;
  room_number?: number | null;
  guest_segments: BookingGuestSegmentValue[];
  total_net_price?: number | null;
  total_sell_price?: number | null;
  promotion_name?: string;
  meal_plan?: string;
  booking_preferences?: string;
  booking_conditions?: string;
  note?: string;
  status?: BookingStatus;
  source_id?: string;
}

export interface BookingFormSubmitPayload {
  values: BookingFormValues;
  guest_number: string;
  isOfflineSource: boolean;
}

export interface BookingFormMeta {
  created_by?: User | null;
  updated_by?: User | null;
  created_at?: string;
  updated_at?: string;
}

interface BookingFormProps {
  mode?: "create" | "edit";
  roomTypeOptions: RoomTypeOption[];
  branchOptions?: BranchOption[];
  sources: Source[];
  initialValues?: Partial<BookingFormValues>;
  meta?: BookingFormMeta;
  submitting?: boolean;
  readonly?: boolean;
  lockPriceFields?: boolean;
  lockStatusField?: boolean;
  lockSourceField?: boolean;
  showSubmitButton?: boolean;
  extraSection?: ReactNode;
  extraActionButtons?: ReactNode;
  middleActionButton?: ReactNode;
  onCancel?: () => void;
  onBranchChange?: (value?: string) => void;
  onSubmit: (payload: BookingFormSubmitPayload) => void | Promise<void>;
  onCreateSource: (name: string) => Promise<Source | null>;
  onUpdateSource: (id: string, name: string) => Promise<boolean>;
  onDeleteSource: (id: string) => Promise<boolean>;
}

const buildGuestNumber = (segments: BookingGuestSegmentValue[]) => {
  const validSegments = segments
    .map((segment) => ({
      count: Number(segment.count),
      type: normalizeOptionalString(segment.type),
    }))
    .filter((segment) => segment.count > 0 && segment.type);

  const totalByType = new Map<string, number>();
  const orderedTypes: string[] = [];

  validSegments.forEach((segment) => {
    const normalizedType = (segment.type || "").toLocaleLowerCase();
    const currentTotal = totalByType.get(normalizedType) || 0;
    totalByType.set(normalizedType, currentTotal + segment.count);

    if (!orderedTypes.includes(normalizedType)) {
      orderedTypes.push(normalizedType);
    }
  });

  return orderedTypes
    .map((type) => `${totalByType.get(type) || 0} ${type}`)
    .join(", ");
};

export default function BookingForm({
  mode = "create",
  roomTypeOptions,
  branchOptions = [],
  sources,
  initialValues,
  meta,
  submitting = false,
  readonly = false,
  lockPriceFields = false,
  lockStatusField = false,
  lockSourceField = false,
  showSubmitButton = true,
  extraSection,
  extraActionButtons,
  middleActionButton,
  onCancel,
  onBranchChange,
  onSubmit,
  onCreateSource,
  onUpdateSource,
  onDeleteSource,
}: BookingFormProps) {
  const t = useTranslations("BookingsPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const messageApi = useMessage();
  const [form] = Form.useForm<BookingFormValues>();
  const selectedSourceId = Form.useWatch("source_id", form);
  const selectedCheckIn = Form.useWatch("check_in", form);
  const selectedCheckOut = Form.useWatch("check_out", form);
  const selectedBranchId = Form.useWatch("branch_id", form);
  const selectedRoomTypeId = Form.useWatch("room_type_id", form);
  const selectedRoomQuantity = Form.useWatch("room_number", form);
  const isEditMode = mode === "edit";
  const latestPriceRequestRef = useRef<string>("");

  const selectedSource = useMemo(
    () => sources.find((source) => source.id === selectedSourceId),
    [selectedSourceId, sources],
  );

  const isOfflineSource = isOfflineSourceName(selectedSource?.name);

  const statusOptions: { label: string; value: BookingStatus }[] = [
    { value: "confirmed", label: t("statuses.confirmed") },
    { value: "cancelled", label: t("statuses.cancelled") },
    { value: "checked-in", label: t("statuses.checkedIn") },
    { value: "checked-out", label: t("statuses.checkedOut") },
  ];

  const guestTypeOptions = useMemo(
    () => [
      { value: "adults", label: t("form.guestTypes.adults") },
      { value: "children", label: t("form.guestTypes.children") },
      { value: "infants", label: t("form.guestTypes.infants") },
    ],
    [t],
  );

  const isActionDisabled = readonly || submitting;

  const formatDateTime = (value?: string) => {
    if (!value) return "--";

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return value;
    }
  };

  const getUserDisplayName = (user?: User | null) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      booking_number: "",
      guest_full_name: "",
      guest_email: "",
      guest_phone: "",
      check_in: undefined,
      check_out: undefined,
      branch_id: undefined,
      room_type_id: undefined,
      room_number: undefined,
      total_net_price: undefined,
      total_sell_price: undefined,
      promotion_name: "",
      meal_plan: "",
      booking_preferences: "",
      booking_conditions: "",
      note: "",
      status: "confirmed",
      source_id: undefined,
      ...initialValues,
      guest_segments:
        initialValues?.guest_segments &&
        Array.isArray(initialValues.guest_segments) &&
        initialValues.guest_segments.length > 0
          ? initialValues.guest_segments
          : [{ count: 2, type: "adults" }],
    });
  }, [form, initialValues]);

  useEffect(() => {
    if (!selectedRoomTypeId) return;
    if (!roomTypeOptions.length) return;
    if (roomTypeOptions.some((option) => option.value === selectedRoomTypeId)) {
      return;
    }

    form.setFields([
      {
        name: "room_type_id",
        value: undefined,
        errors: [],
      },
    ]);
  }, [form, roomTypeOptions, selectedBranchId, selectedRoomTypeId]);

  useEffect(() => {
    if (mode !== "create") return;
    if (!isOfflineSource) return;
    form.setFields([
      {
        name: "booking_number",
        value: "",
        errors: [],
      },
    ]);
  }, [form, isOfflineSource, mode]);

  useEffect(() => {
    if (!isOfflineSource) {
      latestPriceRequestRef.current = "";
      return;
    }

    if (!selectedRoomTypeId || !selectedCheckIn || !selectedCheckOut) {
      latestPriceRequestRef.current = "";
      form.setFields([
        {
          name: "total_sell_price",
          value: undefined,
          errors: [],
        },
        {
          name: "total_net_price",
          value: undefined,
          errors: [],
        },
      ]);
      return;
    }

    if (!selectedCheckOut.isAfter(selectedCheckIn)) return;

    const payload = {
      room_type_id: selectedRoomTypeId.trim(),
      from_date: toUtcDayStartString(selectedCheckIn),
      to_date: toUtcDayStartString(selectedCheckOut),
      quantity:
        typeof selectedRoomQuantity === "number" && selectedRoomQuantity > 0
          ? Math.floor(selectedRoomQuantity)
          : 1,
    };
    const requestKey = JSON.stringify(payload);
    if (latestPriceRequestRef.current === requestKey) return;

    latestPriceRequestRef.current = requestKey;
    let isActive = true;

    void (async () => {
      try {
        const res = await calculateRoomTypePrice(payload);
        if (!isActive) return;

        const totalPrice = Number(res.data.data?.price?.total_price);
        if (!Number.isFinite(totalPrice)) return;

        form.setFields([
          {
            name: "total_sell_price",
            value: totalPrice,
            errors: [],
          },
          {
            name: "total_net_price",
            value: totalPrice,
            errors: [],
          },
        ]);
      } catch (error) {
        if (!isActive) return;
        messageApi.errorFromApi(error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    form,
    isOfflineSource,
    messageApi,
    selectedCheckIn,
    selectedCheckOut,
    selectedRoomQuantity,
    selectedRoomTypeId,
  ]);

  const handleSubmit = async () => {
    if (isActionDisabled) return;

    const values = await form.validateFields();
    const guestSegments = values.guest_segments || [];
    const guestNumber = buildGuestNumber(guestSegments);

    await onSubmit({
      values: {
        ...values,
        booking_number: normalizeOptionalString(values.booking_number),
        promotion_name: normalizeOptionalString(values.promotion_name),
        meal_plan: normalizeOptionalString(values.meal_plan),
        booking_preferences: normalizeOptionalString(
          values.booking_preferences,
        ),
        booking_conditions: normalizeOptionalString(values.booking_conditions),
        note: normalizeOptionalString(values.note),
      },
      guest_number: guestNumber,
      isOfflineSource,
    });
  };

  const submitActionButton = showSubmitButton ? (
    <button
      type="button"
      disabled={isActionDisabled}
      onClick={() => {
        void handleSubmit();
      }}
      className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {mode === "create" ? t("actions.create") : t("actions.save")}
    </button>
  ) : null;

  const cancelActionButton = (
    <button
      type="button"
      onClick={onCancel}
      className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
    >
      {t("actions.cancel")}
    </button>
  );

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      disabled={isActionDisabled}
      className="flex flex-col gap-4 mb-8! [&_.ant-input-disabled]:!text-gray-700 [&_.ant-input-disabled]:!bg-[#f3f4f6] [&_.ant-input-disabled]:!border-gray-200 [&_.ant-input-number-disabled]:!bg-[#f3f4f6] [&_.ant-input-number-disabled]:!border-gray-200 [&_.ant-input-number-input[disabled]]:!text-gray-700 [&_.ant-select-disabled_.ant-select-selector]:!bg-[#f3f4f6] [&_.ant-select-disabled_.ant-select-selector]:!border-gray-200 [&_.ant-select-disabled_.ant-select-selection-item]:!text-gray-700 [&_.ant-select-disabled_.ant-select-selection-placeholder]:!text-gray-500 [&_.ant-picker-disabled]:!bg-[#f3f4f6] [&_.ant-picker-disabled]:!border-gray-200 [&_.ant-picker-disabled_input]:!text-gray-700 [&_.ant-picker-disabled_.ant-picker-suffix]:!text-gray-500"
    >
      <div className="bg-[#f5f5f5] shadow-sm rounded-xl p-4 md:p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.guestInfo")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="source_id"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.source")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("source")),
                },
              ]}
            >
              <SourceSelect
                sources={sources}
                loading={isActionDisabled || lockSourceField}
                onCreateSource={onCreateSource}
                onUpdateSource={onUpdateSource}
                onDeleteSource={onDeleteSource}
                labels={{
                  placeholder: t("form.sourcePlaceholder"),
                  addPlaceholder: t("sources.addPlaceholder"),
                  editPlaceholder: t("sources.editPlaceholder"),
                  addButton: t("sources.add"),
                  empty: t("sources.empty"),
                  save: t("actions.save"),
                  cancel: t("actions.cancel"),
                  edit: t("actions.edit"),
                  delete: t("actions.delete"),
                  deleteTitle: t("sources.delete.title"),
                  deleteDescription: t("sources.delete.description"),
                  deleteConfirm: t("sources.delete.confirm"),
                }}
              />
            </Form.Item>

            <Form.Item
              name="guest_full_name"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.guestFullName")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(
                    validation.field("customerName"),
                  ),
                },
                {
                  min: 1,
                  message: validation.minChars(
                    validation.field("customerName"),
                    1,
                  ),
                },
              ]}
            >
              <Input
                placeholder={t("form.guestFullNamePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="guest_email"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.guestEmail")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("email")),
                },
                {
                  type: "email",
                  message: validation.invalidEmail(),
                },
              ]}
            >
              <Input
                placeholder={t("form.guestEmailPlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="guest_phone"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.guestPhone")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("phone")),
                },
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 10) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.minChars(validation.field("phone"), 10),
                      ),
                    );
                  },
                },
              ]}
            >
              <Input
                placeholder={t("form.guestPhonePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.stayInfo")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="booking_number"
              className="mb-0"
              dependencies={["source_id"]}
              label={
                <span className="text-sm font-medium">
                  {t("form.bookingNumber")}
                  {!isOfflineSource && <span className="text-red-500"> *</span>}
                </span>
              }
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    const currentSourceId = getFieldValue("source_id");
                    const currentSource = sources.find(
                      (source) => source.id === currentSourceId,
                    );
                    const shouldAutoGenerate = isOfflineSourceName(
                      currentSource?.name,
                    );

                    if (shouldAutoGenerate) return Promise.resolve();

                    const nextValue = normalizeOptionalString(value);
                    if (nextValue) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.required(validation.field("bookingNumber")),
                      ),
                    );
                  },
                }),
              ]}
              extra={isOfflineSource ? t("form.bookingNumberAuto") : undefined}
            >
              <Input
                placeholder={t("form.bookingNumberPlaceholder")}
                className={inputClassName}
                disabled={isOfflineSource || mode === "edit"}
              />
            </Form.Item>

            <Form.Item
              name="branch_id"
              className="mb-0"
              label={
                <span className="text-sm font-medium">{t("form.branch")}</span>
              }
            >
              <Select
                showSearch
                allowClear
                optionFilterProp="label"
                placeholder={t("form.branchPlaceholder")}
                options={branchOptions}
                onChange={(value) => onBranchChange?.(value)}
                className={branchSelectClassName}
              />
            </Form.Item>

            <Form.Item
              name="room_type_id"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.roomType")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(
                    validation.field("roomTypeName"),
                  ),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t("form.roomTypePlaceholder")}
                options={roomTypeOptions}
                className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="room_number"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.roomNumber")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  validator: (_, value: number | null | undefined) => {
                    if (value == null || value === 0) {
                      return Promise.reject(
                        new Error(
                          validation.required(validation.field("roomNumber")),
                        ),
                      );
                    }

                    if (value <= 0) {
                      return Promise.reject(
                        new Error(
                          validation.greaterThanZero(
                            validation.field("roomNumber"),
                          ),
                        ),
                      );
                    }

                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={1}
                step={1}
                controls={false}
                precision={0}
                placeholder={t("form.roomNumberPlaceholder")}
                className="w-full! shadow-sm rounded-lg text-sm transition focus-within:ring-2"
                classNames={{
                  input: "px-3 !py-2 !text-sm bg-white h-[39.33px]!",
                }}
              />
            </Form.Item>

            <Form.Item
              name="check_in"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.checkIn")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("checkIn")),
                },
              ]}
            >
              <DatePicker
                showTime={{
                  format: "HH:00",
                  showMinute: false,
                  showSecond: false,
                  showNow: false,
                  defaultOpenValue: CHECK_IN_DEFAULT_OPEN_TIME,
                }}
                format="DD/MM/YYYY HH:00"
                placeholder={t("form.dateTimePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="check_out"
              className="mb-0"
              dependencies={["check_in"]}
              label={
                <span className="text-sm font-medium">
                  {t("form.checkOut")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("checkOut")),
                },
                {
                  validator: (_, value: Dayjs | undefined) => {
                    if (!value || !selectedCheckIn) return Promise.resolve();
                    if (value.isAfter(selectedCheckIn))
                      return Promise.resolve();

                    return Promise.reject(
                      new Error(t("form.checkOutAfterCheckIn")),
                    );
                  },
                },
              ]}
            >
              <DatePicker
                showTime={{
                  format: "HH:00",
                  showMinute: false,
                  showSecond: false,
                  showNow: false,
                  defaultOpenValue: CHECK_OUT_DEFAULT_OPEN_TIME,
                }}
                format="DD/MM/YYYY HH:00"
                placeholder={t("form.dateTimePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>
          </div>

          <div className="mt-2 rounded-lg border border-gray-200 bg-white p-3 mb-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-800">
                {t("form.guestNumber")}
                <span className="text-red-500"> *</span>
              </p>
            </div>

            <Form.List
              name="guest_segments"
              rules={[
                {
                  validator: async (_, value: BookingGuestSegmentValue[]) => {
                    if (!Array.isArray(value) || value.length === 0) {
                      throw new Error(
                        validation.required(validation.field("guestCount")),
                      );
                    }

                    const hasValidSegment = value.some((segment) => {
                      const count = Number(segment?.count);
                      const type = normalizeOptionalString(segment?.type);
                      return count > 0 && Boolean(type);
                    });

                    if (!hasValidSegment) {
                      throw new Error(
                        validation.required(validation.field("guestCount")),
                      );
                    }
                  },
                },
              ]}
            >
              {(fields, { add, remove }, { errors }) => (
                <>
                  <div className="flex flex-col md:flex-row md:flex-wrap items-start gap-3 md:gap-4">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className="grid w-full md:w-auto grid-cols-[96px_minmax(0,1fr)_36px] md:grid-cols-[96px_160px_36px] items-start gap-2"
                      >
                        <Form.Item
                          name={[field.name, "count"]}
                          className="mb-0 min-w-0"
                          rules={[
                            {
                              validator: (
                                _,
                                value: number | null | undefined,
                              ) => {
                                if (value == null || value <= 0) {
                                  return Promise.reject(
                                    new Error(
                                      validation.required(
                                        validation.field("guestCount"),
                                      ),
                                    ),
                                  );
                                }
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <InputNumber
                            min={1}
                            step={1}
                            controls={false}
                            precision={0}
                            placeholder={t("form.guestCountPlaceholder")}
                            className="w-full! shadow-sm rounded-lg text-sm transition focus-within:ring-2"
                            classNames={{
                              input: "px-3 !text-sm bg-white h-[37.66px]!",
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          name={[field.name, "type"]}
                          className="mb-0 min-w-0"
                          rules={[
                            {
                              required: true,
                              message: validation.required(
                                validation.field("guestType"),
                              ),
                            },
                          ]}
                        >
                          <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder={t("form.guestTypePlaceholder")}
                            options={guestTypeOptions}
                            className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
                          />
                        </Form.Item>

                        <button
                          type="button"
                          onClick={() => remove(field.name)}
                          disabled={isActionDisabled || fields.length <= 1}
                          className="h-[39.33px] w-9 inline-flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                          aria-label={t("actions.delete")}
                        >
                          <FiTrash2 className="text-base" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => add({ count: 1, type: "adults" })}
                      disabled={isActionDisabled}
                      className="inline-flex h-[39.33px] w-fit items-center gap-2 rounded-md border border-dashed border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                    >
                      <FiPlus className="text-sm" />
                      {t("form.addGuestGroup")}
                    </button>
                  </div>

                  <Form.ErrorList errors={errors} className="mt-1" />
                </>
              )}
            </Form.List>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.pricing")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="total_sell_price"
              className="mb-0"
              dependencies={["source_id"]}
              label={
                <span className="text-sm font-medium">
                  {t("form.totalSellPrice")}
                  {!isOfflineSource && <span className="text-red-500"> *</span>}
                </span>
              }
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value: number | null | undefined) => {
                    if (lockPriceFields || readonly) return Promise.resolve();
                    const currentSourceId = getFieldValue("source_id");
                    const currentSource = sources.find(
                      (source) => source.id === currentSourceId,
                    );
                    const shouldAutoGeneratePrice = isOfflineSourceName(
                      currentSource?.name,
                    );

                    if (shouldAutoGeneratePrice) return Promise.resolve();

                    if (value == null || value === 0) {
                      return Promise.reject(
                        new Error(
                          validation.required(
                            validation.field("totalSellPrice"),
                          ),
                        ),
                      );
                    }

                    if (value <= 0) {
                      return Promise.reject(
                        new Error(
                          validation.greaterThanZero(
                            validation.field("totalSellPrice"),
                          ),
                        ),
                      );
                    }

                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <InputNumber
                min={0}
                step={1000}
                controls={false}
                placeholder={t("form.totalSellPricePlaceholder")}
                className="w-full! shadow-sm rounded-lg text-sm transition focus-within:ring-2"
                classNames={{
                  input: "px-3 !py-2 !text-sm bg-white h-[39.33px]!",
                }}
                disabled={isOfflineSource || lockPriceFields}
              />
            </Form.Item>

            <Form.Item
              name="total_net_price"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.totalNetPrice")}
                </span>
              }
              rules={[
                {
                  validator: (_, value: number | null | undefined) => {
                    if (lockPriceFields || readonly) return Promise.resolve();
                    if (isOfflineSource) return Promise.resolve();
                    if (value == null) return Promise.resolve();
                    if (value > 0) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.greaterThanZero(
                          validation.field("totalNetPrice"),
                        ),
                      ),
                    );
                  },
                },
              ]}
            >
              <InputNumber
                min={0}
                step={1000}
                controls={false}
                placeholder={t("form.totalNetPricePlaceholder")}
                className="w-full! shadow-sm rounded-lg text-sm transition focus-within:ring-2"
                classNames={{
                  input: "px-3 !py-2 !text-sm bg-white h-[39.33px]!",
                }}
                disabled={isOfflineSource || lockPriceFields}
              />
            </Form.Item>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.additionalInfo")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            {isEditMode && (
              <Form.Item
                name="status"
                className="mb-0"
                label={
                  <span className="text-sm font-medium">
                    {t("form.status")}
                    <span className="text-red-500"> *</span>
                  </span>
                }
                rules={[
                  {
                    required: !lockStatusField,
                    message: validation.required(
                      validation.field("bookingStatus"),
                    ),
                  },
                ]}
              >
                <Select
                  placeholder={t("form.statusPlaceholder")}
                  options={statusOptions}
                  disabled={lockStatusField}
                  className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
                />
              </Form.Item>
            )}

            <Form.Item
              name="promotion_name"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.promotionName")}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 2) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.minChars(t("form.promotionName"), 2),
                      ),
                    );
                  },
                },
              ]}
            >
              <Input
                placeholder={t("form.promotionNamePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="meal_plan"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.mealPlan")}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 2) return Promise.resolve();

                    return Promise.reject(
                      new Error(validation.minChars(t("form.mealPlan"), 2)),
                    );
                  },
                },
              ]}
            >
              <Input
                placeholder={t("form.mealPlanPlaceholder")}
                className={inputClassName}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-y-1">
            <Form.Item
              name="booking_preferences"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.bookingPreferences")}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 2) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.minChars(t("form.bookingPreferences"), 2),
                      ),
                    );
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("form.bookingPreferencesPlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="booking_conditions"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.bookingConditions")}
                </span>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 2) return Promise.resolve();

                    return Promise.reject(
                      new Error(
                        validation.minChars(t("form.bookingConditions"), 2),
                      ),
                    );
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder={t("form.bookingConditionsPlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="note"
              className="mb-0"
              label={
                <span className="text-sm font-medium">{t("form.note")}</span>
              }
              rules={[
                {
                  validator: (_, value: string | undefined) => {
                    const nextValue = normalizeOptionalString(value);
                    if (!nextValue) return Promise.resolve();
                    if (nextValue.length >= 2) return Promise.resolve();

                    return Promise.reject(
                      new Error(validation.minChars(t("form.note"), 2)),
                    );
                  },
                },
              ]}
            >
              <Input.TextArea
                rows={4}
                placeholder={t("form.notePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>
          </div>
        </div>

        {isEditMode && (
          <div className="mb-2 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
            <h4 className="text-sm font-semibold text-[#374151] mb-3">
              {t("detailPage.meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#6B7280] mb-1">
                  {t("detailPage.meta.createdBy")}
                </p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(meta?.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">
                  {t("detailPage.meta.updatedBy")}
                </p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(meta?.updated_by)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">
                  {t("detailPage.meta.createdAt")}
                </p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(meta?.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">
                  {t("detailPage.meta.updatedAt")}
                </p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(meta?.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {extraSection}

      <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {extraActionButtons}
          </div>
          <div className="flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
            {isEditMode ? (
              <>
                {cancelActionButton}
                {middleActionButton}
                {submitActionButton}
              </>
            ) : (
              <>
                {submitActionButton}
                {middleActionButton}
                {cancelActionButton}
              </>
            )}
          </div>
        </div>
      </div>
    </Form>
  );
}
