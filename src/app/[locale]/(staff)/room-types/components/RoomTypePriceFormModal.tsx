"use client";

import { useEffect, useMemo } from "react";
import { Form, InputNumber, Modal, Select } from "antd";
import { useTranslations } from "next-intl";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type {
  RoomTypePrice,
  RoomTypePriceType,
} from "@/types/data/room_type_price";

export type RoomTypePriceDirection = "increase" | "decrease";

export interface RoomTypePriceFormSubmitValues {
  pricing_tag_id: string;
  pricing_type: RoomTypePriceType;
  direction: RoomTypePriceDirection;
  pricing_value: number;
}

interface SelectOption {
  value: string;
  label: string;
}

interface RoomTypePriceFormValues {
  pricing_tag_id: string;
  pricing_type: RoomTypePriceType;
  direction: RoomTypePriceDirection;
  pricing_value: number;
}

interface RoomTypePriceFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  roomTypePrice?: RoomTypePrice;
  pricingTagOptions: SelectOption[];
  roomTypeBasePrice: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: RoomTypePriceFormSubmitValues) => void;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

const safePositiveNumber = (value: unknown) => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
};

const toDirectionFromValue = (value: number): RoomTypePriceDirection =>
  value < 0 ? "decrease" : "increase";

const toAbsoluteValue = (value: number) => Math.abs(value || 0);

export default function RoomTypePriceFormModal({
  open,
  mode,
  roomTypePrice,
  pricingTagOptions,
  roomTypeBasePrice,
  submitting = false,
  onClose,
  onSubmit,
}: RoomTypePriceFormModalProps) {
  const t = useTranslations("RoomTypesPage");
  const validation = useValidationMessages();
  const [form] = Form.useForm<RoomTypePriceFormValues>();
  const watchedDirection = Form.useWatch("direction", form);
  const watchedPricingType = Form.useWatch("pricing_type", form);
  const watchedPricingValue = Form.useWatch("pricing_value", form);

  const currentTagLabel = useMemo(() => {
    if (!roomTypePrice) return "";

    return (
      roomTypePrice.pricing_tag?.name ||
      pricingTagOptions.find(
        (option) => option.value === roomTypePrice.pricing_tag_id,
      )?.label ||
      `#${roomTypePrice.pricing_tag_id}`
    );
  }, [pricingTagOptions, roomTypePrice]);

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !roomTypePrice) return true;

    return (
      watchedDirection !== toDirectionFromValue(roomTypePrice.pricing_value) ||
      watchedPricingType !== roomTypePrice.pricing_type ||
      watchedPricingValue !== toAbsoluteValue(roomTypePrice.pricing_value)
    );
  }, [
    mode,
    roomTypePrice,
    watchedDirection,
    watchedPricingType,
    watchedPricingValue,
  ]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && roomTypePrice) {
      form.setFieldsValue({
        pricing_tag_id: roomTypePrice.pricing_tag_id,
        pricing_type: roomTypePrice.pricing_type,
        direction: toDirectionFromValue(roomTypePrice.pricing_value),
        pricing_value: toAbsoluteValue(roomTypePrice.pricing_value),
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({
      direction: "increase",
      pricing_type: "percent",
      pricing_value: undefined,
      pricing_tag_id: pricingTagOptions[0]?.value,
    });
  }, [form, mode, open, pricingTagOptions, roomTypePrice]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!hasChanges) return;

    const values = await form.validateFields();
    onSubmit(values);
  };

  const maxValue =
    watchedDirection === "decrease" && watchedPricingType === "percent"
      ? 100
      : undefined;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(520px, calc(100vw - 24px))"
      title={
        <span className="text-xl font-bold text-gray-800">
          {t(`pricingStrategies.modal.title.${mode}`)}
        </span>
      }
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 20 },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="flex flex-col gap-1"
      >
        <Form.Item
          name="pricing_tag_id"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("pricingStrategies.form.pricingTag")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={
            mode === "create"
              ? [
                  {
                    required: true,
                    message: validation.required(
                      validation.field("pricingTag"),
                    ),
                  },
                ]
              : undefined
          }
        >
          {mode === "create" ? (
            <Select
              showSearch
              optionFilterProp="label"
              options={pricingTagOptions}
              placeholder={t("pricingStrategies.form.pricingTagPlaceholder")}
              disabled={submitting}
              className="w-full h-[39.33px]! [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
            />
          ) : (
            <div className="rounded-lg border border-gray-200 bg-[#f9fafb] px-3 py-2 text-sm text-gray-700">
              {currentTagLabel}
            </div>
          )}
        </Form.Item>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Form.Item
            name="direction"
            label={
              <span className="text-sm font-medium block mb-1">
                {t("pricingStrategies.form.direction")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(
                  validation.field("pricingDirection"),
                ),
              },
            ]}
          >
            <Select
              placeholder={t("pricingStrategies.form.directionPlaceholder")}
              disabled={submitting}
              options={[
                {
                  value: "increase",
                  label: t("pricingStrategies.options.direction.increase"),
                },
                {
                  value: "decrease",
                  label: t("pricingStrategies.options.direction.decrease"),
                },
              ]}
              className="w-full h-[39.33px]! [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
            />
          </Form.Item>

          <Form.Item
            name="pricing_type"
            label={
              <span className="text-sm font-medium block mb-1">
                {t("pricingStrategies.form.pricingType")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(validation.field("pricingType")),
              },
            ]}
          >
            <Select
              placeholder={t("pricingStrategies.form.pricingTypePlaceholder")}
              disabled={submitting}
              options={[
                {
                  value: "percent",
                  label: t("pricingStrategies.options.type.percent"),
                },
                {
                  value: "amount",
                  label: t("pricingStrategies.options.type.amount"),
                },
              ]}
              className="w-full h-[39.33px]! [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white!"
            />
          </Form.Item>
        </div>

        <Form.Item
          name="pricing_value"
          dependencies={["direction", "pricing_type"]}
          label={
            <span className="text-sm font-medium block mb-1">
              {t("pricingStrategies.form.value")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              validator: (_, value) => {
                const normalizedValue = safePositiveNumber(value);

                if (normalizedValue <= 0) {
                  return Promise.reject(
                    new Error(
                      validation.greaterThanZero(
                        validation.field("pricingValue"),
                      ),
                    ),
                  );
                }

                if (
                  watchedDirection === "decrease" &&
                  watchedPricingType === "percent" &&
                  normalizedValue > 100
                ) {
                  return Promise.reject(
                    new Error(
                      t("pricingStrategies.form.errors.decreasePercentMax"),
                    ),
                  );
                }

                if (
                  watchedDirection === "decrease" &&
                  watchedPricingType === "amount" &&
                  normalizedValue > roomTypeBasePrice
                ) {
                  return Promise.reject(
                    new Error(
                      t("pricingStrategies.form.errors.decreaseAmountMax"),
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
            max={maxValue}
            step={watchedPricingType === "percent" ? 1 : 1000}
            controls={false}
            placeholder={t("pricingStrategies.form.valuePlaceholder")}
            disabled={submitting}
            className={`${inputClassName} !w-full h-[39.33px]!`}
          />
        </Form.Item>
      </Form>

      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
        >
          {t("actions.cancel")}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={submitting || !hasChanges}
          className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:w-auto"
        >
          {mode === "create"
            ? t("pricingStrategies.actions.create")
            : t("actions.save")}
        </button>
      </div>
    </Modal>
  );
}
