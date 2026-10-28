"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Form, Image, Input, Popconfirm, Select, Upload } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { LOCALE_VI } from "@/constants/locale";
import type { User } from "@/types/data/user";
import { CreateUserRequest, UserRole } from "@/types/request/user";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export interface StaffDepartmentOption {
  label: string;
  value: string;
}

export interface StaffBranchOption {
  label: string;
  value: string;
}

export interface StaffFormValues extends Omit<CreateUserRequest, "password"> {
  password?: string;
}

export interface StaffFormMeta {
  created_by?: User;
  updated_by?: User;
  created_at?: string;
  updated_at?: string;
}

export interface StaffFormSubmitPayload {
  values: StaffFormValues;
  avatarFile: File | null;
  avatarRemoved: boolean;
}

interface StaffFormProps {
  mode?: "create" | "edit";
  departmentOptions: StaffDepartmentOption[];
  branchOptions: StaffBranchOption[];
  branchLoading?: boolean;
  submitting?: boolean;
  deleting?: boolean;
  initialValues?: Partial<StaffFormValues>;
  initialAvatarFileList?: UploadFile[];
  meta?: StaffFormMeta;
  cancelHref?: string;
  onCancel?: () => void;
  onDelete?: () => void | Promise<void>;
  onSubmit: (payload: StaffFormSubmitPayload) => void | Promise<void>;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";
const branchSelectClassName = "branch-form-select";

const ALL_BRANCHES_VALUE = "__all_branches__";

const toBranchFieldValue = (branchIds?: string[]) => {
  if (!branchIds?.length) return [ALL_BRANCHES_VALUE];
  return branchIds;
};

const toBranchSubmitValue = (branchIds?: string[]) => {
  if (!branchIds?.length || branchIds.includes(ALL_BRANCHES_VALUE)) return [];
  return branchIds;
};

export default function StaffForm({
  mode = "create",
  departmentOptions,
  branchOptions,
  branchLoading = false,
  submitting = false,
  deleting = false,
  initialValues,
  initialAvatarFileList,
  meta,
  cancelHref,
  onCancel,
  onDelete,
  onSubmit,
}: StaffFormProps) {
  const t = useTranslations("StaffsPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<StaffFormValues>();
  const [avatarFileList, setAvatarFileList] = useState<UploadFile[]>(
    () => initialAvatarFileList || [],
  );
  const branchIdsRef = useRef<string[]>(
    toBranchFieldValue(initialValues?.branch_ids),
  );
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const watchedFirstName = Form.useWatch("first_name", form);
  const watchedLastName = Form.useWatch("last_name", form);
  const watchedUsername = Form.useWatch("username", form);
  const watchedEmail = Form.useWatch("email", form);
  const watchedPhone = Form.useWatch("phone", form);
  const selectedRole = Form.useWatch("role", form);
  const selectedStatus = Form.useWatch("is_active", form);
  const watchedDepartmentId = Form.useWatch("department_id", form);
  const watchedBranchIds = Form.useWatch("branch_ids", form);
  const isAdminRole = selectedRole === "admin";
  const isEditMode = mode === "edit";
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

  const defaultValues = useMemo<StaffFormValues>(
    () => ({
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      phone: "",
      role: "staff",
      is_active: true,
      department_id: undefined,
      branch_ids: [ALL_BRANCHES_VALUE],
      ...(mode === "create" ? { password: "" } : {}),
    }),
    [mode],
  );

  useEffect(() => {
    const nextBranchIds = toBranchFieldValue(initialValues?.branch_ids);
    branchIdsRef.current = nextBranchIds;
    form.resetFields();
    form.setFieldsValue({
      ...defaultValues,
      ...initialValues,
      department_id: initialValues?.department_id || undefined,
      branch_ids: nextBranchIds,
    });
  }, [defaultValues, form, initialValues]);

  useEffect(() => {
    if (!isAdminRole) return;
    form.setFieldValue("department_id", undefined);
  }, [form, isAdminRole]);

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

  const getUserDisplayName = (user?: User) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  const beforeUpload: UploadProps["beforeUpload"] = () => false;

  const handleAvatarChange: UploadProps["onChange"] = ({ fileList }) => {
    setAvatarFileList(fileList.slice(-1));
  };

  const handleClearAvatar = () => {
    setAvatarFileList([]);
  };

  const handleAvatarPreview: UploadProps["onPreview"] = async (file) => {
    if (file.url) {
      window.open(file.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (file.thumbUrl) {
      window.open(file.thumbUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (!file.originFileObj) return;
    const previewUrl = URL.createObjectURL(file.originFileObj);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(previewUrl), 1000);
  };

  const localAvatarPreviewUrl = useMemo(() => {
    const file = avatarFileList[0]?.originFileObj;
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [avatarFileList]);

  useEffect(() => {
    return () => {
      if (localAvatarPreviewUrl) URL.revokeObjectURL(localAvatarPreviewUrl);
    };
  }, [localAvatarPreviewUrl]);

  const avatarPreviewUrl =
    avatarFileList[0]?.url ||
    avatarFileList[0]?.thumbUrl ||
    localAvatarPreviewUrl;

  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    if (!initialValues) return false;

    const currentRole = selectedRole === "admin" ? "admin" : "staff";
    const initialRole = initialValues.role === "admin" ? "admin" : "staff";
    const currentDepartmentId =
      currentRole === "admin" ? undefined : watchedDepartmentId || undefined;
    const initialDepartmentId =
      initialRole === "admin"
        ? undefined
        : initialValues.department_id || undefined;
    const currentBranchIds = [...toBranchSubmitValue(watchedBranchIds)].sort();
    const initialBranchIds = [...(initialValues.branch_ids || [])].sort();

    const hasFieldChanges =
      (watchedFirstName || "") !== (initialValues.first_name || "") ||
      (watchedLastName || "") !== (initialValues.last_name || "") ||
      (watchedUsername || "") !== (initialValues.username || "") ||
      (watchedEmail || "") !== (initialValues.email || "") ||
      (watchedPhone || "") !== (initialValues.phone || "") ||
      currentRole !== initialRole ||
      Boolean(selectedStatus) !== Boolean(initialValues.is_active) ||
      currentDepartmentId !== initialDepartmentId ||
      currentBranchIds.join(",") !== initialBranchIds.join(",");

    const hasInitialAvatar = Boolean(initialAvatarFileList?.length);
    const currentAvatar = avatarFileList[0];
    const currentAvatarFile = currentAvatar?.originFileObj;

    let hasAvatarChanges = false;
    if (currentAvatarFile instanceof File) {
      hasAvatarChanges = true;
    } else if (!hasInitialAvatar && avatarFileList.length > 0) {
      hasAvatarChanges = true;
    } else if (hasInitialAvatar && avatarFileList.length === 0) {
      hasAvatarChanges = true;
    } else if (hasInitialAvatar && avatarFileList.length > 0) {
      const initialAvatarUrl =
        initialAvatarFileList?.[0]?.url || initialAvatarFileList?.[0]?.thumbUrl;
      const currentAvatarUrl = currentAvatar?.url || currentAvatar?.thumbUrl;
      hasAvatarChanges = initialAvatarUrl !== currentAvatarUrl;
    }

    return hasFieldChanges || hasAvatarChanges;
  }, [
    avatarFileList,
    initialAvatarFileList,
    initialValues,
    isEditMode,
    selectedRole,
    selectedStatus,
    watchedDepartmentId,
    watchedBranchIds,
    watchedEmail,
    watchedFirstName,
    watchedLastName,
    watchedPhone,
    watchedUsername,
  ]);

  const handleSubmit = async () => {
    if (submitting || deleting) return;
    if (isEditMode && !hasChanges) return;
    const values = await form.validateFields();
    const avatarFile = avatarFileList[0]?.originFileObj;
    const hasInitialAvatar = Boolean(initialAvatarFileList?.length);
    const hasAvatarInForm = avatarFileList.length > 0;

    await onSubmit({
      values: {
        ...values,
        is_active: mode === "create" ? true : Boolean(values.is_active),
        department_id:
          values.role === "admin"
            ? undefined
            : (values.department_id ?? undefined),
        branch_ids: toBranchSubmitValue(values.branch_ids),
      },
      avatarFile: avatarFile instanceof File ? avatarFile : null,
      avatarRemoved: isEditMode && hasInitialAvatar && !hasAvatarInForm,
    });
  };

  const roleOptions: { label: string; value: UserRole }[] = [
    { label: t("roles.staff"), value: "staff" },
    { label: t("roles.admin"), value: "admin" },
  ];

  const handleBranchesChange = (values: string[]) => {
    const previousValues = branchIdsRef.current;
    const hadAllBranches = previousValues.includes(ALL_BRANCHES_VALUE);
    const hasAllBranches = values.includes(ALL_BRANCHES_VALUE);

    let nextValues: string[];
    if (!values.length) {
      nextValues = [ALL_BRANCHES_VALUE];
    } else if (hasAllBranches && hadAllBranches) {
      nextValues = values.filter((value) => value !== ALL_BRANCHES_VALUE);
      if (!nextValues.length) nextValues = [ALL_BRANCHES_VALUE];
    } else if (hasAllBranches) {
      nextValues = [ALL_BRANCHES_VALUE];
    } else {
      nextValues = values;
    }

    branchIdsRef.current = nextValues;
    form.setFieldValue("branch_ids", nextValues);
  };

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
            {t("form.sections.personalInfo")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="first_name"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.firstName")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("firstName")),
                },
              ]}
            >
              <Input
                placeholder={t("form.firstNamePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="last_name"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.lastName")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("lastName")),
                },
              ]}
            >
              <Input
                placeholder={t("form.lastNamePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="email"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.email")}
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
                placeholder={t("form.emailPlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="phone"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
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
                  pattern: /^\d{10}$/,
                  message: validation.exactChars(validation.field("phone"), 10),
                },
              ]}
            >
              <Input
                placeholder={t("form.phonePlaceholder")}
                maxLength={10}
                className={inputClassName}
              />
            </Form.Item>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4 tracking-wide text-black">
            {t("form.sections.workInfo")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="role"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.role")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(t("form.role")),
                },
              ]}
            >
              <Select
                placeholder={t("form.rolePlaceholder")}
                options={roleOptions}
                className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="department_id"
              className="mb-0"
              dependencies={["role"]}
              label={
                <span className="text-sm font-medium">
                  {t("form.department")}
                  {selectedRole === "staff" && (
                    <span className="text-red-500"> *</span>
                  )}
                </span>
              }
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, value) => {
                    if (getFieldValue("role") !== "staff")
                      return Promise.resolve();
                    if (value) return Promise.resolve();
                    return Promise.reject(
                      new Error(
                        validation.required(validation.field("department")),
                      ),
                    );
                  },
                }),
              ]}
            >
              <Select
                allowClear
                disabled={isAdminRole}
                placeholder={t("form.departmentPlaceholder")}
                options={departmentOptions}
                className="w-full [&_.ant-select-selector]:shadow-sm! [&_.ant-select-selector]:rounded-lg! [&_.ant-select-selector]:!px-3 [&_.ant-select-selector]:!py-[18px] [&_.ant-select-selector]:bg-white! shadow-sm rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition"
              />
            </Form.Item>

            <Form.Item
              name="branch_ids"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.branches")}
                </span>
              }
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
            {t("form.sections.accountInfo")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="username"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.username")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("username")),
                },
                {
                  min: 5,
                  message: validation.minChars(validation.field("username"), 5),
                },
              ]}
            >
              <Input
                placeholder={t("form.usernamePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            {mode === "create" ? (
              <Form.Item
                name="password"
                className="mb-0"
                label={
                  <span className="text-sm font-medium">
                    {t("form.password")}
                    <span className="text-red-500"> *</span>
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: validation.required(validation.field("password")),
                  },
                  {
                    min: 6,
                    message: validation.minChars(
                      validation.field("password"),
                      6,
                    ),
                  },
                ]}
              >
                <Input.Password
                  placeholder={t("form.passwordPlaceholder")}
                  className={inputClassName}
                  iconRender={(visible) =>
                    visible ? (
                      <FaEye size={18} style={{ color: "#9CA3AF" }} />
                    ) : (
                      <FaEyeSlash size={18} style={{ color: "#9CA3AF" }} />
                    )
                  }
                />
              </Form.Item>
            ) : (
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
            )}
          </div>
        </div>

        <div>
          <Form.Item
            className="mb-0"
            label={
              <span className="text-sm font-medium">{t("form.avatar")}</span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_144px] gap-4 items-start">
              <div>
                <Upload.Dragger
                  accept="image/*"
                  maxCount={1}
                  multiple={false}
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  fileList={avatarFileList}
                  onPreview={handleAvatarPreview}
                  onChange={handleAvatarChange}
                  onRemove={() => {
                    handleClearAvatar();
                    return true;
                  }}
                  className="h-[156px] [&_.ant-upload-drag]:!h-[156px] [&_.ant-upload-drag]:!border-dashed [&_.ant-upload-drag]:!border-gray-300 [&_.ant-upload-drag]:!bg-[#fafafa] [&_.ant-upload-btn]:!h-full [&_.ant-upload-btn]:!flex [&_.ant-upload-btn]:!flex-col [&_.ant-upload-btn]:!items-center [&_.ant-upload-btn]:!justify-center"
                >
                  <p className="mb-2 text-gray-500 flex justify-center">
                    <InboxOutlined className="text-3xl" />
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {t("form.avatarUploadTitle")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("form.avatarUploadHint")}
                  </p>
                </Upload.Dragger>
              </div>

              <div className="relative h-[156px] rounded-lg border border-gray-200 bg-[#fafafa] overflow-hidden">
                {avatarPreviewUrl ? (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleClearAvatar();
                      }}
                      className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 border border-gray-300 text-gray-600 hover:bg-white transition cursor-pointer flex items-center justify-center"
                      aria-label={t("actions.delete")}
                    >
                      <CloseOutlined className="text-xs" />
                    </button>
                    <div
                      onClick={() => setIsAvatarPreviewOpen(true)}
                      role="img"
                      aria-label="avatar-preview"
                      className="absolute inset-0 bg-center bg-cover bg-no-repeat cursor-zoom-in"
                      style={{ backgroundImage: `url(${avatarPreviewUrl})` }}
                    />
                    <Image
                      src={avatarPreviewUrl}
                      alt="avatar-preview"
                      preview={{
                        open: isAvatarPreviewOpen,
                        onOpenChange: (open) => setIsAvatarPreviewOpen(open),
                      }}
                      className="hidden"
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 px-3 text-center">
                    {t("form.avatarUploadHint")}
                  </div>
                )}
              </div>
            </div>
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
