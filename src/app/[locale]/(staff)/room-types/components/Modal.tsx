"use client";

import { useEffect, useMemo } from "react";
import { Modal, Input, Form, InputNumber, Select } from "antd";
import { RoomType } from "@/types/data/room_type";
import { useLocale, useTranslations } from "next-intl";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { LOCALE_VI } from "@/constants/locale";
import RoomTypePricingStrategiesSection from "./RoomTypePricingStrategiesSection";

interface SelectOption {
  value: string;
  label: string;
}

const ALL_BRANCHES_VALUE = "__all_branches__";
const branchSelectClassName = "branch-form-select";

interface RoomTypeFormValues {
  name: string;
  price: number;
  surfaceArea: number;
  maxPeople: number;
  branchIds: string[];
}

interface RoomTypeModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  roomType?: RoomType;
  branchOptions: SelectOption[];
  branchLoading?: boolean;
  submitting?: boolean;
  onSubmit?: (data: RoomTypeFormValues) => void;
}

export default function RoomTypeModal({
  open,
  onClose,
  mode,
  roomType,
  branchOptions,
  branchLoading = false,
  submitting = false,
  onSubmit,
}: RoomTypeModalProps) {
  const t = useTranslations("RoomTypesPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<RoomTypeFormValues>();
  const watchedName = Form.useWatch("name", form);
  const watchedPrice = Form.useWatch("price", form);
  const watchedSurfaceArea = Form.useWatch("surfaceArea", form);
  const watchedMaxPeople = Form.useWatch("maxPeople", form);
  const watchedBranchIds = Form.useWatch("branchIds", form);
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

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !roomType) return true;

    const currentBranchIds = [...(watchedBranchIds || [])].sort();
    const roomTypeBranchIds = [
      ...(roomType.branches || []).map((branch) => branch.id),
    ].sort();

    return (
      (watchedName || "") !== (roomType.name || "") ||
      watchedPrice !== (roomType.price || 0) ||
      watchedSurfaceArea !== (roomType.surface_area || 0) ||
      watchedMaxPeople !== (roomType.max_people || 1) ||
      currentBranchIds.join(",") !== roomTypeBranchIds.join(",")
    );
  }, [
    mode,
    roomType,
    watchedBranchIds,
    watchedMaxPeople,
    watchedName,
    watchedPrice,
    watchedSurfaceArea,
  ]);

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

  const getUserDisplayName = (user?: RoomType["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && roomType) {
      form.setFieldsValue({
        name: roomType.name || "",
        price: roomType.price || 0,
        surfaceArea: roomType.surface_area || 0,
        maxPeople: roomType.max_people || 1,
        branchIds: (roomType.branches || []).map((branch) => branch.id),
      });
      return;
    }

    form.resetFields();
  }, [mode, roomType, open, form]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!hasChanges) return;
    if (!onSubmit) return;
    const values = await form.validateFields();
    onSubmit(values);
  };

  const handleBranchesChange = (values: string[]) => {
    if (!values.includes(ALL_BRANCHES_VALUE)) return;

    form.setFieldValue(
      "branchIds",
      branchOptions.map((branch) => branch.value),
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(560px, calc(100vw - 24px))"
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">
          {t(`modal.title.${mode}`)}
        </span>
      }
    >
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          className="flex flex-col gap-1"
        >
          <Form.Item
            name="name"
            label={
              <span className="text-gray-800 text-sm font-medium">
                {t("form.name")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(validation.field("roomTypeName")),
              },
              {
                min: 2,
                message: validation.minChars(
                  validation.field("roomTypeName"),
                  2,
                ),
              },
            ]}
          >
            <Input
              placeholder={t("form.namePlaceholder")}
              className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
            />
          </Form.Item>

          <Form.Item
            name="maxPeople"
            label={
              <span className="text-sm font-medium block mb-1">
                {t("form.maxPeople")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(t("form.maxPeople")),
              },
              {
                type: "number",
                min: 1,
                message: validation.greaterThanZero(t("form.maxPeople")),
              },
            ]}
          >
            <InputNumber
              min={1}
              step={1}
              precision={0}
              controls={false}
              placeholder={t("form.maxPeoplePlaceholder")}
              className="shadow-sm w-full! h-[39.33px]! rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
            />
          </Form.Item>

          <Form.Item
            name="branchIds"
            label={
              <span className="text-sm font-medium block mb-1">
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
            <Form.Item
              name="surfaceArea"
              label={
                <span className="text-sm font-medium block mb-1">
                  {t("form.surfaceArea")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(t("form.surfaceArea")),
                },
                {
                  type: "number",
                  min: 0.000001,
                  message: validation.greaterThanZero(t("form.surfaceArea")),
                },
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                controls={false}
                placeholder={t("form.surfaceAreaPlaceholder")}
                className="shadow-sm w-full! h-[39.33px]! rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="price"
              label={
                <span className="text-sm font-medium block mb-1">
                  {t("form.price")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("roomPrice")),
                },
                {
                  type: "number",
                  min: 0.000001,
                  message: validation.greaterThanZero(
                    validation.field("roomPrice"),
                  ),
                },
              ]}
            >
              <InputNumber
                min={0}
                step={0.01}
                controls={false}
                placeholder={t("form.pricePlaceholder")}
                className="shadow-sm w-full! h-[39.33px]! rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>
          </div>

          {mode === "edit" && roomType && (
            <>
              <RoomTypePricingStrategiesSection roomType={roomType} />

              <div className="mb-2 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-[#374151] mb-3">
                  {t("meta.title")}
                </h4>

                <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-[#6B7280] mb-1">{t("meta.createdBy")}</p>
                    <p className="font-medium text-[#111827]">
                      {getUserDisplayName(roomType.created_by)}
                    </p>
                  </div>

                  <div className="sm:text-end">
                    <p className="text-[#6B7280] mb-1">{t("meta.updatedBy")}</p>
                    <p className="font-medium text-[#111827]">
                      {getUserDisplayName(roomType.updated_by)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[#6B7280] mb-1">{t("meta.createdAt")}</p>
                    <p className="font-medium text-[#111827]">
                      {formatDateTime(roomType.created_at)}
                    </p>
                  </div>

                  <div className="sm:text-end">
                    <p className="text-[#6B7280] mb-1">{t("meta.updatedAt")}</p>
                    <p className="font-medium text-[#111827]">
                      {formatDateTime(roomType.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </Form>

        <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
          >
            {t("actions.cancel")}
          </button>
          <button
            className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:w-auto"
            onClick={handleSubmit}
            disabled={submitting || !hasChanges}
          >
            {mode === "create" ? t("actions.create") : t("actions.save")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
