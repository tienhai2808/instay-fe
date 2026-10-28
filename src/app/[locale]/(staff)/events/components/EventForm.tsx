"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloseOutlined, InboxOutlined } from "@ant-design/icons";
import { Form, Image, Input, Popconfirm, Select, Upload } from "antd";
import type { UploadFile, UploadProps } from "antd";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import RichTextEditor, {
  type RichTextEditorEmbeddedImage,
} from "@/components/shared/ui/RichTextEditor";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type { User } from "@/types/data/user";
import {
  extractPlainTextFromRichText,
  hasMeaningfulRichTextContent,
} from "@/utils/rich-text";

const { TextArea } = Input;

export interface EventBranchOption {
  label: string;
  value: string;
}

export interface EventFormValues {
  title: string;
  excerpt: string;
  content: string;
  thumbnail?: string;
  is_active: boolean;
  branch_ids: string[];
  send_notification: boolean;
}

export interface EventFormMeta {
  created_by?: User | null;
  updated_by?: User | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
}

export interface EventFormSubmitPayload {
  values: EventFormValues;
  thumbnailFile: File | null;
  contentImages: RichTextEditorEmbeddedImage[];
  intent: "draft" | "publish" | "save";
}

interface EventFormProps {
  mode?: "create" | "edit";
  branchOptions?: EventBranchOption[];
  branchLoading?: boolean;
  allowGlobalBranches?: boolean;
  readOnly?: boolean;
  submitting?: boolean;
  deleting?: boolean;
  showSendNotification?: boolean;
  initialValues?: Partial<EventFormValues>;
  initialThumbnailFileList?: UploadFile[];
  meta?: EventFormMeta;
  cancelHref?: string;
  onCancel?: () => void;
  onDelete?: () => void | Promise<void>;
  onSubmit: (payload: EventFormSubmitPayload) => void | Promise<void>;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";
const selectClassName = "branch-form-select";
const AUTO_EXCERPT_LENGTH = 100;
const AUTO_EXCERPT_DELAY_MS = 500;
const ALL_BRANCHES_VALUE = "__all_branches__";

const toBranchFieldValue = (
  branchIds?: string[],
  allowGlobalBranches = true,
) => {
  if (!branchIds?.length)
    return allowGlobalBranches ? [ALL_BRANCHES_VALUE] : [];
  return branchIds;
};

const toBranchSubmitValue = (
  branchIds?: string[],
  allowGlobalBranches = true,
) => {
  if (
    allowGlobalBranches &&
    (!branchIds?.length || branchIds.includes(ALL_BRANCHES_VALUE))
  ) {
    return [];
  }

  return (branchIds || []).filter(
    (branchId) => branchId !== ALL_BRANCHES_VALUE,
  );
};

export default function EventForm({
  mode = "create",
  branchOptions = [],
  branchLoading = false,
  allowGlobalBranches = true,
  readOnly = false,
  submitting = false,
  deleting = false,
  showSendNotification = true,
  initialValues,
  initialThumbnailFileList,
  meta,
  cancelHref,
  onCancel,
  onDelete,
  onSubmit,
}: EventFormProps) {
  const t = useTranslations("EventsPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<EventFormValues>();
  const [thumbnailFileList, setThumbnailFileList] = useState<UploadFile[]>(
    () => initialThumbnailFileList || [],
  );
  const [isThumbnailPreviewOpen, setIsThumbnailPreviewOpen] = useState(false);
  const [contentImages, setContentImages] = useState<
    RichTextEditorEmbeddedImage[]
  >([]);
  const branchIdsRef = useRef<string[]>(
    toBranchFieldValue(initialValues?.branch_ids, allowGlobalBranches),
  );
  const lastAutoExcerptRef = useRef("");
  const isEditMode = mode === "edit";

  const watchedTitle = Form.useWatch("title", form);
  const watchedExcerpt = Form.useWatch("excerpt", form);
  const watchedContent = Form.useWatch("content", form);
  const selectedStatus = Form.useWatch("is_active", form);
  const selectedSendNotification = Form.useWatch("send_notification", form);
  const watchedBranchIds = Form.useWatch("branch_ids", form);

  const branchSelectOptions = useMemo(
    () => [
      ...(allowGlobalBranches
        ? [
            {
              value: ALL_BRANCHES_VALUE,
              label: t("form.allBranches"),
            },
          ]
        : []),
      ...branchOptions,
    ],
    [allowGlobalBranches, branchOptions, t],
  );

  const defaultValues = useMemo<EventFormValues>(
    () => ({
      title: "",
      excerpt: "",
      content: "",
      thumbnail: undefined,
      is_active: true,
      branch_ids: allowGlobalBranches ? [ALL_BRANCHES_VALUE] : [],
      send_notification: false,
    }),
    [allowGlobalBranches],
  );

  useEffect(() => {
    const nextBranchIds = toBranchFieldValue(
      initialValues?.branch_ids,
      allowGlobalBranches,
    );
    branchIdsRef.current = nextBranchIds;
    form.resetFields();
    form.setFieldsValue({
      ...defaultValues,
      ...initialValues,
      branch_ids: nextBranchIds,
    });
    lastAutoExcerptRef.current = "";
  }, [allowGlobalBranches, defaultValues, form, initialValues]);

  useEffect(() => {
    const contentPlainText = extractPlainTextFromRichText(watchedContent);
    const nextAutoExcerpt = contentPlainText
      .slice(0, AUTO_EXCERPT_LENGTH)
      .trim();
    const currentExcerpt = (watchedExcerpt || "").trim();

    if (!nextAutoExcerpt) {
      if (!currentExcerpt) {
        lastAutoExcerptRef.current = "";
      }
      return;
    }

    if (currentExcerpt && currentExcerpt !== lastAutoExcerptRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const latestExcerpt = String(form.getFieldValue("excerpt") || "").trim();

      if (latestExcerpt && latestExcerpt !== lastAutoExcerptRef.current) {
        return;
      }

      form.setFieldValue("excerpt", nextAutoExcerpt);
      lastAutoExcerptRef.current = nextAutoExcerpt;
    }, AUTO_EXCERPT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [form, watchedContent, watchedExcerpt]);

  const formatDateTime = (value?: string | null) => {
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

  const beforeUpload: UploadProps["beforeUpload"] = () => false;

  const handleThumbnailChange: UploadProps["onChange"] = ({ fileList }) => {
    setThumbnailFileList(fileList.slice(-1));
    form.setFields([{ name: "thumbnail", errors: [] }]);
  };

  const handleClearThumbnail = () => {
    setThumbnailFileList([]);
  };

  const handleThumbnailPreview: UploadProps["onPreview"] = async (file) => {
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

  const localThumbnailPreviewUrl = useMemo(() => {
    const file = thumbnailFileList[0]?.originFileObj;
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [thumbnailFileList]);

  useEffect(() => {
    return () => {
      if (localThumbnailPreviewUrl) {
        URL.revokeObjectURL(localThumbnailPreviewUrl);
      }
    };
  }, [localThumbnailPreviewUrl]);

  const thumbnailPreviewUrl =
    thumbnailFileList[0]?.url ||
    thumbnailFileList[0]?.thumbUrl ||
    localThumbnailPreviewUrl;

  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    if (!initialValues) return false;

    const hasFieldChanges =
      (watchedTitle || "") !== (initialValues.title || "") ||
      (watchedExcerpt || "") !== (initialValues.excerpt || "") ||
      (watchedContent || "") !== (initialValues.content || "") ||
      Boolean(selectedStatus) !== Boolean(initialValues.is_active) ||
      [...toBranchSubmitValue(watchedBranchIds, allowGlobalBranches)]
        .sort()
        .join(",") !== [...(initialValues.branch_ids || [])].sort().join(",") ||
      Boolean(selectedSendNotification) !==
        Boolean(initialValues.send_notification);

    const hasInitialThumbnail = Boolean(initialThumbnailFileList?.length);
    const currentThumbnail = thumbnailFileList[0];
    const currentThumbnailFile = currentThumbnail?.originFileObj;

    let hasThumbnailChanges = false;
    if (currentThumbnailFile instanceof File) {
      hasThumbnailChanges = true;
    } else if (!hasInitialThumbnail && thumbnailFileList.length > 0) {
      hasThumbnailChanges = true;
    } else if (hasInitialThumbnail && thumbnailFileList.length === 0) {
      hasThumbnailChanges = true;
    } else if (hasInitialThumbnail && thumbnailFileList.length > 0) {
      const initialThumbnailUrl =
        initialThumbnailFileList?.[0]?.url ||
        initialThumbnailFileList?.[0]?.thumbUrl;
      const currentThumbnailUrl =
        currentThumbnail?.url || currentThumbnail?.thumbUrl;
      hasThumbnailChanges = initialThumbnailUrl !== currentThumbnailUrl;
    }

    return hasFieldChanges || hasThumbnailChanges;
  }, [
    initialThumbnailFileList,
    initialValues,
    isEditMode,
    allowGlobalBranches,
    selectedSendNotification,
    selectedStatus,
    thumbnailFileList,
    watchedBranchIds,
    watchedContent,
    watchedExcerpt,
    watchedTitle,
  ]);

  const handleSubmit = async (intent: "draft" | "publish" | "save") => {
    if (submitting || deleting || readOnly) return;
    if (isEditMode && !hasChanges) return;

    const values = await form.validateFields();
    const thumbnailFile = thumbnailFileList[0]?.originFileObj;

    if (!thumbnailFileList.length) {
      form.setFields([
        {
          name: "thumbnail",
          errors: [validation.required(validation.field("eventThumbnail"))],
        },
      ]);
      return;
    }

    await onSubmit({
      values: {
        ...values,
        is_active:
          mode === "create" ? intent === "publish" : Boolean(values.is_active),
        branch_ids: toBranchSubmitValue(values.branch_ids, allowGlobalBranches),
        send_notification: showSendNotification
          ? Boolean(values.send_notification)
          : false,
      },
      thumbnailFile: thumbnailFile instanceof File ? thumbnailFile : null,
      contentImages,
      intent,
    });
  };

  const handleBranchesChange = (values: string[]) => {
    if (!allowGlobalBranches) {
      branchIdsRef.current = values;
      form.setFieldValue("branch_ids", values);
      return;
    }

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
      disabled={readOnly}
      className="flex flex-col gap-4 mb-8!"
    >
      <div className="bg-[#f5f5f5] shadow-sm rounded-xl p-4 md:p-6 flex flex-col gap-4">
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="title"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.title")}
                  <span className="text-red-500"> *</span>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: validation.required(validation.field("eventTitle")),
                },
                {
                  min: 2,
                  message: validation.minChars(
                    validation.field("eventTitle"),
                    2,
                  ),
                },
              ]}
            >
              <Input
                placeholder={t("form.titlePlaceholder")}
                className={inputClassName}
              />
            </Form.Item>

            <Form.Item
              name="branch_ids"
              className="mb-0"
              label={
                <span className="text-sm font-medium">
                  {t("form.branches")}
                  {!allowGlobalBranches ? (
                    <span className="text-red-500"> *</span>
                  ) : null}
                </span>
              }
              rules={
                allowGlobalBranches
                  ? []
                  : [
                      {
                        type: "array",
                        min: 1,
                        message: validation.required(t("form.branches")),
                      },
                    ]
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
                className={selectClassName}
              />
            </Form.Item>
          </div>
        </div>

        <div>
          <Form.Item
            name="content"
            className="mb-0"
            validateTrigger={[]}
            label={
              <span className="text-sm font-medium">
                {t("form.content")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                validator: (_, value: string | undefined) =>
                  hasMeaningfulRichTextContent(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          validation.required(validation.field("eventContent")),
                        ),
                      ),
              },
            ]}
          >
            <RichTextEditor
              placeholder={t("form.contentPlaceholder")}
              hasError={form.getFieldError("content").length > 0}
              toolbar="full"
              allowImages
              onEmbeddedImagesChange={setContentImages}
            />
          </Form.Item>
        </div>

        <div>
          <Form.Item
            name="excerpt"
            className="mb-0"
            label={
              <span className="text-sm font-medium">
                {t("form.excerpt")}
                <span className="text-red-500"> *</span>
              </span>
            }
            rules={[
              {
                required: true,
                message: validation.required(validation.field("eventExcerpt")),
              },
              {
                min: 2,
                message: validation.minChars(
                  validation.field("eventExcerpt"),
                  2,
                ),
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder={t("form.excerptPlaceholder")}
              className={inputClassName}
            />
          </Form.Item>
        </div>

        <div>
          <Form.Item
            name="thumbnail"
            className="mb-0"
            label={
              <span className="text-sm font-medium">
                {t("form.thumbnail")}
                <span className="text-red-500"> *</span>
              </span>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_144px] gap-4 items-start">
              <div>
                <Upload.Dragger
                  disabled={readOnly}
                  accept="image/*"
                  maxCount={1}
                  multiple={false}
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  fileList={thumbnailFileList}
                  onPreview={handleThumbnailPreview}
                  onChange={handleThumbnailChange}
                  onRemove={() => {
                    handleClearThumbnail();
                    return true;
                  }}
                  className="h-[156px] [&_.ant-upload-drag]:!h-[156px] [&_.ant-upload-drag]:!border-dashed [&_.ant-upload-drag]:!border-gray-300 [&_.ant-upload-drag]:!bg-[#fafafa] [&_.ant-upload-btn]:!h-full [&_.ant-upload-btn]:!flex [&_.ant-upload-btn]:!flex-col [&_.ant-upload-btn]:!items-center [&_.ant-upload-btn]:!justify-center"
                >
                  <p className="mb-2 text-gray-500 flex justify-center">
                    <InboxOutlined className="text-3xl" />
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {t("form.thumbnailUploadTitle")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("form.thumbnailUploadHint")}
                  </p>
                </Upload.Dragger>
              </div>

              <div className="relative h-[156px] rounded-lg border border-gray-200 bg-[#fafafa] overflow-hidden">
                {thumbnailPreviewUrl ? (
                  <>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={(event) => {
                        if (readOnly) return;
                        event.stopPropagation();
                        handleClearThumbnail();
                      }}
                      className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 border border-gray-300 text-gray-600 hover:bg-white transition cursor-pointer flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={t("actions.delete")}
                    >
                      <CloseOutlined className="text-xs" />
                    </button>
                    <div
                      onClick={() => setIsThumbnailPreviewOpen(true)}
                      role="img"
                      aria-label="thumbnail-preview"
                      className="absolute inset-0 bg-center bg-cover bg-no-repeat cursor-zoom-in"
                      style={{ backgroundImage: `url(${thumbnailPreviewUrl})` }}
                    />
                    <Image
                      src={thumbnailPreviewUrl}
                      alt="thumbnail-preview"
                      preview={{
                        open: isThumbnailPreviewOpen,
                        onOpenChange: (open) => setIsThumbnailPreviewOpen(open),
                      }}
                      className="hidden"
                    />
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 px-3 text-center">
                    {t("form.thumbnailUploadHint")}
                  </div>
                )}
              </div>
            </div>
          </Form.Item>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showSendNotification ? (
              <Form.Item
                name="send_notification"
                className="mb-0"
                label={
                  <span className="text-sm font-medium">
                    {t("form.sendNotification")}
                  </span>
                }
              >
                <div className="flex flex-wrap items-center justify-start gap-2 rounded-lg bg-[#F3F4F6] p-1">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      form.setFieldValue("send_notification", false)
                    }
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                      selectedSendNotification !== true
                        ? "bg-white text-[#111827] shadow-sm cursor-not-allowed"
                        : "text-[#6B7280] hover:text-[#111827] cursor-pointer"
                    }`}
                  >
                    {t("sendNotificationOptions.no")}
                  </button>
                  <div className="h-6 w-px bg-[#E5E7EB]" />
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      form.setFieldValue("send_notification", true)
                    }
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                      selectedSendNotification === true
                        ? "bg-white text-[#111827] shadow-sm cursor-not-allowed"
                        : "text-[#6B7280] hover:text-[#111827] cursor-pointer"
                    }`}
                  >
                    {t("sendNotificationOptions.yes")}
                  </button>
                </div>
              </Form.Item>
            ) : null}

            {isEditMode ? (
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
                    disabled={readOnly}
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
                    disabled={readOnly}
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
            ) : null}
          </div>

          {showSendNotification ? (
            <p className="mt-2 text-xs text-gray-500">
              {t("form.sendNotificationHint")}
            </p>
          ) : null}
        </div>

        {isEditMode ? (
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

              <div className="sm:col-span-2">
                <p className="text-[#6B7280] mb-1">
                  {t("detailPage.meta.publishedAt")}
                </p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(meta?.published_at)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
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
            disabled={submitting || deleting || readOnly || !onDelete}
          >
            <button
              type="button"
              disabled={submitting || deleting || readOnly || !onDelete}
              className="w-full cursor-pointer rounded-md border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 hover:border-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t("actions.delete")}
            </button>
          </Popconfirm>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {cancelHref ? (
              <Link
                href={cancelHref}
                className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium !text-gray-700 transition hover:bg-gray-50 sm:w-auto text-center no-underline"
              >
                {t("actions.cancel")}
              </Link>
            ) : null}
            <button
              type="button"
              disabled={submitting || deleting || readOnly || !hasChanges}
              onClick={() => {
                void handleSubmit("save");
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
              void handleSubmit("draft");
            }}
            className="w-full cursor-pointer rounded-md border border-[#111827] bg-white px-3 py-2 text-sm font-medium text-[#111827] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("actions.saveDraft")}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              void handleSubmit("publish");
            }}
            className="w-full cursor-pointer rounded-md bg-[#8b5cf6] px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("actions.create")}
          </button>
        </div>
      )}
    </Form>
  );
}
