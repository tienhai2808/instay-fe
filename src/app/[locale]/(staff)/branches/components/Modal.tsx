"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, Modal, Select } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type { Branch } from "@/types/data/branch";
import type { VietnamProvince } from "@/utils/vietnamese-provinces";
import {
  matchesProvinceValue,
  matchesWardValue,
} from "@/utils/vietnamese-provinces";

interface BranchFormValues {
  name: string;
  address: string;
  city: string;
  ward: string;
  is_active: boolean;
}

interface BranchModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  branch?: Branch;
  provinces: VietnamProvince[];
  submitting?: boolean;
  onSubmit?: (data: BranchFormValues) => void;
}

const findProvinceByValue = (
  provinces: VietnamProvince[],
  value?: string | null,
) => provinces.find((province) => matchesProvinceValue(province, value));

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

const selectClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

export default function BranchModal({
  open,
  onClose,
  mode,
  branch,
  provinces,
  submitting = false,
  onSubmit,
}: BranchModalProps) {
  const t = useTranslations("BranchPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<BranchFormValues>();
  const watchedName = Form.useWatch("name", form);
  const watchedAddress = Form.useWatch("address", form);
  const watchedCity = Form.useWatch("city", form);
  const watchedWard = Form.useWatch("ward", form);
  const watchedIsActive = Form.useWatch("is_active", form);

  const selectedProvince = useMemo(
    () => findProvinceByValue(provinces, watchedCity),
    [provinces, watchedCity],
  );

  const cityOptions = useMemo(() => {
    const options = provinces.map((province) => ({
      label: province.name,
      value: province.name,
    }));

    if (
      mode === "edit" &&
      watchedCity &&
      !options.some((option) => option.value === watchedCity)
    ) {
      return [{ label: watchedCity, value: watchedCity }, ...options];
    }

    return options;
  }, [mode, provinces, watchedCity]);

  const wardOptions = useMemo(() => {
    const options =
      selectedProvince?.wards.map((ward) => ({
        label: ward.name,
        value: ward.name,
      })) || [];

    if (
      mode === "edit" &&
      watchedWard &&
      !options.some((option) => option.value === watchedWard)
    ) {
      return [{ label: watchedWard, value: watchedWard }, ...options];
    }

    return options;
  }, [mode, selectedProvince, watchedWard]);

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !branch) return true;

    return (
      (watchedName || "") !== (branch.name || "") ||
      (watchedAddress || "") !== (branch.address || "") ||
      (watchedCity || "") !== (branch.city || "") ||
      (watchedWard || "") !== (branch.ward || "") ||
      Boolean(watchedIsActive) !== Boolean(branch.is_active)
    );
  }, [
    branch,
    mode,
    watchedAddress,
    watchedCity,
    watchedIsActive,
    watchedName,
    watchedWard,
  ]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && branch) {
      form.setFieldsValue({
        name: branch.name || "",
        address: branch.address || "",
        city: branch.city || "",
        ward: branch.ward || "",
        is_active: Boolean(branch.is_active),
      });
      return;
    }

    form.resetFields();
    form.setFieldsValue({ is_active: true });
  }, [branch, form, mode, open]);

  useEffect(() => {
    if (!selectedProvince) return;

    const currentWard = form.getFieldValue("ward");
    if (!currentWard) return;

    const belongsToProvince = selectedProvince.wards.some((ward) =>
      matchesWardValue(ward, currentWard),
    );

    if (!belongsToProvince) {
      form.setFieldValue("ward", undefined);
    }
  }, [form, selectedProvince]);

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

  const getUserDisplayName = (user?: Branch["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  const handleSubmit = async () => {
    if (submitting || !hasChanges || !onSubmit) return;
    const values = await form.validateFields();
    onSubmit(values);
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
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        className="flex flex-col gap-1"
        initialValues={{ is_active: true }}
      >
        <Form.Item
          name="name"
          label={
            <span className="text-sm font-medium text-gray-800">
              {t("form.name")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(t("form.name")),
            },
            {
              min: 2,
              message: validation.minChars(t("form.name"), 2),
            },
          ]}
        >
          <Input
            placeholder={t("form.namePlaceholder")}
            className={inputClassName}
          />
        </Form.Item>

        <Form.Item
          name="address"
          label={
            <span className="text-sm font-medium">
              {t("form.address")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(t("form.address")),
            },
            {
              min: 2,
              message: validation.minChars(t("form.address"), 2),
            },
          ]}
        >
          <Input
            placeholder={t("form.addressPlaceholder")}
            className={inputClassName}
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item
            name="city"
            label={
              <span className="text-sm font-medium">
                {t("form.city")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(validation.field("city")),
              },
            ]}
          >
            <Select
              showSearch
              options={cityOptions}
              placeholder={t("form.cityPlaceholder")}
              optionFilterProp="label"
              className={selectClassName}
              popupClassName="branch-select-dropdown"
              onChange={() => form.setFieldValue("ward", undefined)}
            />
          </Form.Item>

          <Form.Item
            name="ward"
            label={
              <span className="text-sm font-medium">
                {t("form.ward")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(t("form.ward")),
              },
            ]}
          >
            <Select
              showSearch
              options={wardOptions}
              placeholder={t("form.wardPlaceholder")}
              optionFilterProp="label"
              className={selectClassName}
              popupClassName="branch-select-dropdown"
              disabled={!watchedCity}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="is_active"
          label={
            <span className="text-sm font-medium">{t("form.status")}</span>
          }
          className="mb-2"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => form.setFieldValue("is_active", true)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                watchedIsActive !== false
                  ? "border-[#111827] bg-[#111827] text-white shadow-sm"
                  : "border-[#d1d5db] bg-white text-[#374151] hover:border-[#111827]/30"
              }`}
            >
              <p className="text-sm font-semibold">{t("statuses.active")}</p>
            </button>

            <button
              type="button"
              onClick={() => form.setFieldValue("is_active", false)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                watchedIsActive === false
                  ? "border-[#111827] bg-[#111827] text-white shadow-sm"
                  : "border-[#d1d5db] bg-white text-[#374151] hover:border-[#111827]/30"
              }`}
            >
              <p className="text-sm font-semibold">{t("statuses.inactive")}</p>
            </button>
          </div>
        </Form.Item>

        {mode === "edit" && branch && (
          <div className="mb-2 rounded-lg border border-gray-200 bg-[#f5f5f5] p-4">
            <h4 className="mb-3 text-sm font-semibold text-[#374151]">
              {t("meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[#6B7280]">{t("meta.createdBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(branch.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="mb-1 text-[#6B7280]">{t("meta.updatedBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(branch.updated_by)}
                </p>
              </div>

              <div>
                <p className="mb-1 text-[#6B7280]">{t("meta.createdAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(branch.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="mb-1 text-[#6B7280]">{t("meta.updatedAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(branch.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Form>

      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button
          onClick={onClose}
          disabled={submitting}
          className="w-full cursor-pointer rounded-md border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {t("actions.cancel")}
        </button>
        <button
          className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-6 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          onClick={handleSubmit}
          disabled={submitting || !hasChanges}
        >
          {mode === "create" ? t("actions.create") : t("actions.save")}
        </button>
      </div>
    </Modal>
  );
}
