"use client";

import { useEffect, useMemo } from "react";
import { Form, Input, Modal, Select } from "antd";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { ServiceType } from "@/types/data/service_type";
import { UpdateServiceTypeRequest } from "@/types/request/service_type";
import {
  DEFAULT_SERVICE_TYPE_ICON,
  getServiceTypeIconComponent,
  normalizeServiceTypeIconName,
  SERVICE_TYPE_ICON_OPTIONS,
} from "../constants/icons";

interface SelectOption {
  value: string;
  label: string;
}

export type ServiceTypeFormValues = UpdateServiceTypeRequest;

interface ServiceTypeModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  serviceType?: ServiceType;
  departmentOptions: SelectOption[];
  submitting?: boolean;
  onSubmit?: (data: ServiceTypeFormValues) => void;
}

interface ServiceTypeIconGridProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

function ServiceTypeIconGrid({
  value,
  onChange,
  disabled = false,
}: ServiceTypeIconGridProps) {
  const selectedIconName = normalizeServiceTypeIconName(value);

  return (
    <div className="max-h-49.5 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {SERVICE_TYPE_ICON_OPTIONS.map((iconName) => {
          const Icon = getServiceTypeIconComponent(iconName);
          const isActive = selectedIconName === iconName;

          return (
            <button
              key={iconName}
              type="button"
              title={iconName}
              aria-label={iconName}
              onClick={() => onChange?.(iconName)}
              disabled={disabled}
              className={`cursor-pointer rounded-lg border p-3 transition ${
                isActive
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <span className="flex items-center justify-center">
                <Icon className="text-3xl" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ServiceTypeModal({
  open,
  onClose,
  mode,
  serviceType,
  departmentOptions,
  submitting = false,
  onSubmit,
}: ServiceTypeModalProps) {
  const t = useTranslations("ServiceTypesPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<ServiceTypeFormValues>();
  const watchedName = Form.useWatch("name", form);
  const watchedDepartmentId = Form.useWatch("department_id", form);
  const watchedIcon = Form.useWatch("icon", form);

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !serviceType) return true;

    return (
      (watchedName || "") !== (serviceType.name || "") ||
      (watchedDepartmentId || undefined) !==
        (serviceType.department?.id || undefined) ||
      normalizeServiceTypeIconName(watchedIcon) !==
        normalizeServiceTypeIconName(serviceType.icon)
    );
  }, [mode, serviceType, watchedDepartmentId, watchedIcon, watchedName]);

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

  const getUserDisplayName = (user?: ServiceType["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && serviceType) {
      form.setFieldsValue({
        name: serviceType.name || "",
        department_id: serviceType.department?.id,
        icon: normalizeServiceTypeIconName(serviceType.icon),
      });
      return;
    }

    form.resetFields();
    form.setFieldValue("icon", DEFAULT_SERVICE_TYPE_ICON);
  }, [form, mode, open, serviceType]);

  useEffect(() => {
    if (!open) return;

    const selectedDepartmentId = form.getFieldValue("department_id");
    if (!selectedDepartmentId) return;

    const isDepartmentAvailable = departmentOptions.some(
      (department) => department.value === selectedDepartmentId,
    );

    if (!isDepartmentAvailable) {
      form.setFieldValue("department_id", undefined);
    }
  }, [departmentOptions, form, open]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!hasChanges) return;
    if (!onSubmit) return;
    const values = await form.validateFields();
    onSubmit(values);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(620px, calc(100vw - 24px))"
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
              message: validation.required(validation.field("serviceTypeName")),
            },
            {
              min: 2,
              message: validation.minChars(
                validation.field("serviceTypeName"),
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
          name="icon"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.icon")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("serviceTypeIcon")),
            },
          ]}
        >
          <ServiceTypeIconGrid disabled={submitting} />
        </Form.Item>

        <Form.Item
          name="department_id"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.department")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("department")),
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t("form.departmentPlaceholder")}
            options={departmentOptions}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        {mode === "edit" && serviceType && (
          <div className="mb-2 mt-4 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-[#374151] mb-3">
              {t("meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(serviceType.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(serviceType.updated_by)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(serviceType.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(serviceType.updated_at)}
                </p>
              </div>
            </div>
          </div>
        )}
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
          className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer sm:w-auto"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={submitting || !hasChanges}
        >
          {mode === "create" ? t("actions.create") : t("actions.save")}
        </button>
      </div>
    </Modal>
  );
}
