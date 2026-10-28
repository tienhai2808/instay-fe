"use client";

import { useEffect, useMemo, useState } from "react";
import { DatePicker, Form, Input, InputNumber, Popconfirm, Select } from "antd";
import type { Dayjs } from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import RichTextEditor from "@/components/shared/ui/RichTextEditor";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type { ServiceDiscountType } from "@/types/request/service";
import type { User } from "@/types/data/user";
import {
  extractPlainTextFromRichText,
  normalizeRichTextHtml,
} from "@/utils/rich-text";
import ServiceImagesInput, {
  type ServiceImageInputItem,
} from "./ServiceImagesInput";

export interface ServiceTypeOption {
  label: string;
  value: string;
}

export interface BranchOption {
  label: string;
  value: string;
}

export interface ServiceFormValues {
  name: string;
  service_type_id: string;
  branch_ids: string[];
  price: number;
  is_active: boolean;
  description: string;
  discount_type?: ServiceDiscountType;
  discount_value?: number;
  discount_start_at?: Dayjs;
  discount_end_at?: Dayjs;
}

export interface ServiceFormMeta {
  created_by?: User | null;
  updated_by?: User | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceFormSubmitPayload {
  values: ServiceFormValues;
  images: ServiceImageInputItem[];
}

interface ServiceFormProps {
  mode?: "create" | "edit";
  serviceTypeOptions: ServiceTypeOption[];
  branchOptions: BranchOption[];
  branchLoading?: boolean;
  submitting?: boolean;
  deleting?: boolean;
  initialValues?: Partial<ServiceFormValues>;
  initialImages?: ServiceImageInputItem[];
  meta?: ServiceFormMeta;
  cancelHref?: string;
  onCancel?: () => void;
  onDelete?: () => void | Promise<void>;
  onSubmit: (payload: ServiceFormSubmitPayload) => void | Promise<void>;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";
const branchSelectClassName = "branch-form-select";

const ALL_BRANCHES_VALUE = "__all_branches__";

const normalizeThumbnail = (items: ServiceImageInputItem[]) => {
  if (!items.length) return items;

  const selectedIndex = items.findIndex((item) => item.is_thumbnail);
  const thumbnailIndex = selectedIndex >= 0 ? selectedIndex : 0;

  return items.map((item, index) => ({
    ...item,
    is_thumbnail: index === thumbnailIndex,
  }));
};

const toImageComparableId = (item: ServiceImageInputItem) => {
  if (item.key) return `key:${item.key}`;
  if (item.file instanceof File) {
    return `file:${item.file.name}:${item.file.size}:${item.file.lastModified}`;
  }
  return `id:${item.id}`;
};

const getDateTimestamp = (value?: Dayjs) => {
  if (!value) return undefined;
  return value.isValid() ? value.valueOf() : undefined;
};

const isEmptyOptionalField = (value: unknown) => {
  if (value == null) return true;
  if (typeof value === "string") return !value.trim();
  return false;
};

export default function ServiceForm({
  mode = "create",
  serviceTypeOptions,
  branchOptions,
  branchLoading = false,
  submitting = false,
  deleting = false,
  initialValues,
  initialImages,
  meta,
  cancelHref,
  onCancel,
  onDelete,
  onSubmit,
}: ServiceFormProps) {
  const t = useTranslations("ServicesPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<ServiceFormValues>();
  const [imageItems, setImageItems] = useState<ServiceImageInputItem[]>(() =>
    normalizeThumbnail(initialImages || []),
  );
  const [imagesError, setImagesError] = useState<string | undefined>(undefined);
  const isEditMode = mode === "edit";

  const watchedName = Form.useWatch("name", form);
  const watchedServiceTypeId = Form.useWatch("service_type_id", form);
  const watchedBranchIds = Form.useWatch("branch_ids", form);
  const watchedPrice = Form.useWatch("price", form);
  const selectedStatus = Form.useWatch("is_active", form);
  const watchedDescription = Form.useWatch("description", form);
  const watchedDiscountType = Form.useWatch("discount_type", form);
  const watchedDiscountValue = Form.useWatch("discount_value", form);
  const watchedDiscountStartAt = Form.useWatch("discount_start_at", form);
  const watchedDiscountEndAt = Form.useWatch("discount_end_at", form);
  const normalizedInitialDescription = useMemo(
    () => normalizeRichTextHtml(initialValues?.description || ""),
    [initialValues?.description],
  );
  const branchSelectOptions = useMemo(
    () => [
      {
        value: ALL_BRANCHES_VALUE,
        label: t("form.allBranches"),
      },
      ...branchOptions,
    ],
    [branchOptions, t],
  );

  const defaultValues = useMemo<ServiceFormValues>(
    () => ({
      name: "",
      service_type_id: "",
      branch_ids: [],
      price: 0,
      is_active: true,
      description: "",
      discount_type: undefined,
      discount_value: undefined,
      discount_start_at: undefined,
      discount_end_at: undefined,
    }),
    [],
  );

  useEffect(() => {
    form.resetFields();
    form.setFieldsValue({
      ...defaultValues,
      ...initialValues,
      description: normalizedInitialDescription,
    });
  }, [defaultValues, form, initialValues, normalizedInitialDescription]);

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

  const handleSubmit = async () => {
    if (submitting || deleting) return;
    if (isEditMode && !hasChanges) return;

    const values = await form.validateFields();

    const discountFieldConfigs = [
      {
        name: "discount_type" as const,
        label: validation.field("serviceDiscountType"),
      },
      {
        name: "discount_value" as const,
        label: validation.field("serviceDiscountValue"),
      },
      {
        name: "discount_start_at" as const,
        label: validation.field("serviceDiscountStartAt"),
      },
      {
        name: "discount_end_at" as const,
        label: validation.field("serviceDiscountEndAt"),
      },
    ];

    const missingDiscountFields = discountFieldConfigs.filter(({ name }) =>
      isEmptyOptionalField(values[name]),
    );
    const hasAnyDiscountField =
      missingDiscountFields.length < discountFieldConfigs.length;

    if (hasAnyDiscountField && missingDiscountFields.length > 0) {
      form.setFields(
        discountFieldConfigs.map(({ name, label }) => ({
          name,
          errors: isEmptyOptionalField(values[name])
            ? [validation.required(label)]
            : [],
        })),
      );
      return;
    }

    if (hasAnyDiscountField) {
      const discountStartAt = getDateTimestamp(values.discount_start_at);
      const discountEndAt = getDateTimestamp(values.discount_end_at);

      if (
        discountStartAt != null &&
        discountEndAt != null &&
        discountEndAt < discountStartAt
      ) {
        const invalidRangeMessage = t("form.discountDateRangeInvalid");
        form.setFields([
          { name: "discount_start_at", errors: [invalidRangeMessage] },
          { name: "discount_end_at", errors: [invalidRangeMessage] },
        ]);
        return;
      }
    }

    form.setFields(
      discountFieldConfigs.map(({ name }) => ({ name, errors: [] })),
    );

    const normalizedImages = normalizeThumbnail(imageItems);

    if (!normalizedImages.length) {
      setImagesError(validation.required(validation.field("serviceImages")));
      return;
    }

    setImagesError(undefined);

    await onSubmit({
      values: {
        ...values,
        branch_ids: values.branch_ids || [],
        is_active: mode === "create" ? true : Boolean(values.is_active),
      },
      images: normalizedImages,
    });
  };

  const handleBranchesChange = (values: string[]) => {
    if (!values.includes(ALL_BRANCHES_VALUE)) return;

    form.setFieldValue(
      "branch_ids",
      branchOptions.map((branch) => branch.value),
    );
  };

  let hasChanges = true;
  if (isEditMode) {
    if (!initialValues) {
      hasChanges = false;
    } else {
      const currentBranchIds = [...(watchedBranchIds || [])].sort();
      const initialBranchIds = [...(initialValues.branch_ids || [])].sort();
      const hasFieldChanges =
        (watchedName || "") !== (initialValues.name || "") ||
        (watchedServiceTypeId || "") !==
          (initialValues.service_type_id || "") ||
        currentBranchIds.join(",") !== initialBranchIds.join(",") ||
        watchedPrice !== (initialValues.price || 0) ||
        Boolean(selectedStatus) !== Boolean(initialValues.is_active) ||
        (watchedDescription || "") !== normalizedInitialDescription ||
        (watchedDiscountType || "") !== (initialValues.discount_type || "") ||
        watchedDiscountValue !== initialValues.discount_value ||
        getDateTimestamp(watchedDiscountStartAt) !==
          getDateTimestamp(initialValues.discount_start_at) ||
        getDateTimestamp(watchedDiscountEndAt) !==
          getDateTimestamp(initialValues.discount_end_at);

      const normalizedInitialImages = normalizeThumbnail(initialImages || []);
      const normalizedCurrentImages = normalizeThumbnail(imageItems);

      const hasImageChanges =
        normalizedInitialImages.length !== normalizedCurrentImages.length ||
        normalizedCurrentImages.some((currentImage, index) => {
          const initialImage = normalizedInitialImages[index];
          if (!initialImage) return true;

          return (
            toImageComparableId(currentImage) !==
              toImageComparableId(initialImage) ||
            Boolean(currentImage.is_thumbnail) !==
              Boolean(initialImage.is_thumbnail)
          );
        });

      hasChanges = hasFieldChanges || hasImageChanges;
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      className="flex flex-col gap-4 mb-8!"
    >
      <div className="bg-[#f5f5f5] shadow-sm rounded-xl p-4 md:p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.basicInfo")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="name"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.name")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("serviceName")),
                },
                {
                  min: 2,
                  message: validation.minChars(
                    validation.field("serviceName"),
                    2,
                  ),
                },
              ]}
            >
              <Input
                placeholder={t("form.namePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="service_type_id"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.serviceType")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("serviceType")),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder={t("form.serviceTypePlaceholder")}
                options={serviceTypeOptions}
                className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="branch_ids"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.branches")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  type: "array",
                  min: 1,
                  message: validation.required(t("form.branches")),
                },
              ]}
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                loading={branchLoading}
                placeholder={t("form.branchesPlaceholder")}
                options={branchSelectOptions}
                maxTagCount="responsive"
                onChange={handleBranchesChange}
                className={branchSelectClassName}
              />
            </Form.Item>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.pricing")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="price"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.price")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  validator: (_, value) => {
                    if (value == null || value === "") {
                      return Promise.reject(
                        new Error(
                          validation.required(validation.field("servicePrice")),
                        ),
                      );
                    }

                    if (typeof value !== "number" || value <= 0) {
                      return Promise.reject(
                        new Error(
                          validation.greaterThanZero(
                            validation.field("servicePrice"),
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
                min={0}
                step={1000}
                controls={false}
                placeholder={t("form.pricePlaceholder")}
                className={`${inputClassName} !w-full h-[39.33px]!`}
              />
            </Form.Item>

            <Form.Item
              name="discount_type"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.discountType")}
                </span>
              }
            >
              <Select
                allowClear
                placeholder={t("form.discountTypePlaceholder")}
                options={[
                  {
                    value: "percent",
                    label: t("form.discountTypeOptions.percent"),
                  },
                  {
                    value: "amount",
                    label: t("form.discountTypeOptions.amount"),
                  },
                ]}
                className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="discount_value"
              dependencies={["discount_type", "price"]}
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.discountValue")}
                </span>
              }
              rules={[
                {
                  validator: (_, value) => {
                    if (value == null || value === "") {
                      return Promise.resolve();
                    }

                    if (typeof value !== "number" || value <= 0) {
                      return Promise.reject(
                        new Error(
                          validation.greaterThanZero(
                            validation.field("serviceDiscountValue"),
                          ),
                        ),
                      );
                    }

                    if (watchedDiscountType === "percent" && value > 100) {
                      return Promise.reject(
                        new Error(t("form.discountPercentRangeInvalid")),
                      );
                    }

                    if (
                      watchedDiscountType === "amount" &&
                      typeof watchedPrice === "number" &&
                      watchedPrice > 0 &&
                      value > watchedPrice
                    ) {
                      return Promise.reject(
                        new Error(t("form.discountAmountRangeInvalid")),
                      );
                    }

                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber
                min={0}
                max={watchedDiscountType === "percent" ? 100 : undefined}
                step={watchedDiscountType === "percent" ? 1 : 1000}
                controls={false}
                placeholder={t("form.discountValuePlaceholder")}
                className={`${inputClassName} !w-full h-[39.33px]!`}
              />
            </Form.Item>

            <Form.Item
              name="discount_start_at"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.discountStartAt")}
                </span>
              }
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                placeholder={t("form.discountStartAtPlaceholder")}
                className={`${inputClassName} !w-full h-[39.33px]!`}
              />
            </Form.Item>

            <Form.Item
              name="discount_end_at"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.discountEndAt")}
                </span>
              }
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                placeholder={t("form.discountEndAtPlaceholder")}
                className={`${inputClassName} !w-full h-[39.33px]!`}
              />
            </Form.Item>
          </div>

          <p className="mt-2 text-xs text-gray-500">
            {t("form.discountGroupHint")}
          </p>
        </div>

        <div>
          <Form.Item
            name="description"
            className="mb-0"
            validateTrigger={[]}
            label={
              <span className="text-sm font-medium">
                {t("form.description")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                validator: (_, value: string | undefined) => {
                  const plainText = extractPlainTextFromRichText(value);

                  if (!plainText) {
                    return Promise.reject(
                      new Error(
                        validation.required(
                          validation.field("serviceDescription"),
                        ),
                      ),
                    );
                  }

                  if (plainText.length < 2) {
                    return Promise.reject(
                      new Error(
                        validation.minChars(
                          validation.field("serviceDescription"),
                          2,
                        ),
                      ),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <RichTextEditor
              placeholder={t("form.descriptionPlaceholder")}
              hasError={form.getFieldError("description").length > 0}
            />
          </Form.Item>
        </div>

        {isEditMode && (
          <div>
            <Form.Item
              name="is_active"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.status")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  validator: (_, value) =>
                    typeof value === "boolean"
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(validation.required(t("form.status"))),
                        ),
                },
              ]}
            >
              <div className="flex flex-wrap items-center justify-start gap-2 rounded-lg bg-[#F3F4F6] p-1">
                <button
                  type="button"
                  onClick={() => form.setFieldValue("is_active", true)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    selectedStatus !== false
                      ? "bg-white text-[#111827] shadow-sm cursor-not-allowed"
                      : "text-[#6B7280] hover:text-[#111827] cursor-pointer"
                  }`}
                >
                  {t("statuses.active")}
                </button>
                <div className="h-6 w-px bg-[#E5E7EB]" />
                <button
                  type="button"
                  onClick={() => form.setFieldValue("is_active", false)}
                  className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                    selectedStatus === false
                      ? "bg-white text-[#111827] shadow-sm cursor-not-allowed"
                      : "text-[#6B7280] hover:text-[#111827] cursor-pointer"
                  }`}
                >
                  {t("statuses.inactive")}
                </button>
              </div>
            </Form.Item>
          </div>
        )}

        <div>
          <Form.Item
            className="mb-0"
            label={
              <span className="text-sm font-medium">
                {t("form.images")}
                <span className="text-red-500"> *</span>
              </span>
            }
            validateStatus={imagesError ? "error" : undefined}
            help={imagesError}
          >
            <ServiceImagesInput
              value={imageItems}
              onChange={(nextValue) => {
                setImageItems(nextValue);
                if (imagesError && nextValue.length > 0) {
                  setImagesError(undefined);
                }
              }}
              disabled={submitting || deleting}
              labels={{
                title: t("form.imagesUploadTitle"),
                hint: t("form.imagesUploadHint"),
                dragHint: t("form.imagesDragHint"),
                thumbnail: t("form.thumbnail"),
                setThumbnail: t("form.setThumbnail"),
                noImages: t("form.imagesEmpty"),
                removeImage: t("actions.delete"),
              }}
            />
          </Form.Item>
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

      {isEditMode ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Popconfirm
            title={t("delete.title")}
            description={t("delete.description")}
            onConfirm={() => onDelete?.()}
            okText={t("delete.confirm")}
            cancelText={t("actions.cancel")}
            okButtonProps={{ danger: true }}
            disabled={submitting || deleting || !onDelete}
          >
            <button
              type="button"
              disabled={submitting || deleting || !onDelete}
              className="w-full cursor-pointer rounded-md border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.delete")}
            </button>
          </Popconfirm>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {cancelHref && (
              <Link
                href={cancelHref}
                className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium !text-gray-700 transition hover:bg-gray-50 sm:w-auto text-center no-underline"
              >
                {t("actions.cancel")}
              </Link>
            )}
            <button
              type="button"
              disabled={submitting || deleting || !hasChanges}
              onClick={() => {
                void handleSubmit();
              }}
              className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.save")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              void handleSubmit();
            }}
            className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {mode === "create" ? t("actions.create") : t("actions.save")}
          </button>
        </div>
      )}
    </Form>
  );
}
