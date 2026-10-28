"use client";

import { useEffect, useMemo } from "react";
import { Modal, Input, Checkbox, Form } from "antd";
import { Department, Permission } from "@/types/data/department";
import { useLocale, useTranslations } from "next-intl";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { LOCALE_VI } from "@/constants/locale";
import { isCustomerServiceDepartmentName } from "@/constants/department";

const { TextArea } = Input;

interface DepartmentFormValues {
  name: string;
  phone?: string;
  description: string;
  permissionIds: string[];
}

interface DepartmentModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  department?: Department;
  permissions: Permission[];
  submitting?: boolean;
  onSubmit?: (data: DepartmentFormValues) => void;
}

export default function DepartmentModal({
  open,
  onClose,
  mode,
  department,
  permissions,
  submitting = false,
  onSubmit,
}: DepartmentModalProps) {
  const t = useTranslations("DepartmentPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<DepartmentFormValues>();
  const watchedName = Form.useWatch("name", form);
  const watchedPhone = Form.useWatch("phone", form);
  const watchedDescription = Form.useWatch("description", form);
  const watchedPermissionIds = Form.useWatch("permissionIds", form);
  const isProtectedDepartment =
    mode === "edit" && isCustomerServiceDepartmentName(department?.name);

  const initialPermissionIds = useMemo(
    () =>
      [...(department?.permissions?.map((permission) => permission.id) || [])]
        .filter(Boolean)
        .sort(),
    [department?.permissions],
  );

  const hasChanges = useMemo(() => {
    if (mode !== "edit" || !department) return true;

    const currentPermissionIds = [...(watchedPermissionIds || [])]
      .filter(Boolean)
      .sort();

    const isPermissionChanged =
      currentPermissionIds.length !== initialPermissionIds.length ||
      currentPermissionIds.some(
        (permissionId, index) => permissionId !== initialPermissionIds[index],
      );

    return (
      (watchedName || "") !== (department.name || "") ||
      (watchedPhone || "") !== (department.phone || "") ||
      (watchedDescription || "") !== (department.description || "") ||
      isPermissionChanged
    );
  }, [
    department,
    initialPermissionIds,
    mode,
    watchedDescription,
    watchedName,
    watchedPermissionIds,
    watchedPhone,
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

  const getUserDisplayName = (user?: Department["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  const getPermissionLabel = (permission: Permission) => {
    const localizedName =
      locale === LOCALE_VI
        ? permission.display_name_vi
        : permission.display_name_en;

    return localizedName || permission.name;
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && department) {
      form.setFieldsValue({
        name: department.name || "",
        phone: department.phone || "",
        description: department.description || "",
        permissionIds:
          department.permissions?.map((p: Permission) => p.id) || [],
      });
      return;
    }

    form.resetFields();
  }, [mode, department, open, form]);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!hasChanges) return;
    if (!onSubmit) return;
    const values = await form.validateFields();
    onSubmit({
      ...values,
      // Keep name in PUT payload even when name input is disabled.
      name: values.name || department?.name || "",
    });
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
              message: validation.required(validation.field("department")),
            },
            {
              min: 2,
              message: validation.minChars(validation.field("department"), 2),
            },
          ]}
        >
          <Input
            placeholder={t("form.namePlaceholder")}
            disabled={isProtectedDepartment}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        <Form.Item
          name="phone"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.phone")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("phone")),
            },
            {
              max: 20,
              message: t("form.phoneMaxLength"),
            },
          ]}
        >
          <Input
            placeholder={t("form.phonePlaceholder")}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        <Form.Item
          name="description"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.description")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(t("form.description")),
            },
          ]}
        >
          <TextArea
            placeholder={t("form.descriptionPlaceholder")}
            rows={4}
            className="shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
          />
        </Form.Item>

        <Form.Item
          name="permissionIds"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.permissions")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              type: "array",
              min: 1,
              message: validation.required(t("form.permissions")),
            },
          ]}
        >
          <Checkbox.Group className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {permissions.map((p: Permission) => (
              <Checkbox key={p.id} value={p.id}>
                {getPermissionLabel(p)}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>

        {mode === "edit" && department && (
          <div className="mb-2 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-[#374151] mb-3">
              {t("meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(department.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(department.updated_by)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(department.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(department.updated_at)}
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
    </Modal>
  );
}
