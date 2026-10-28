"use client";

import { Modal, Form, Input } from "antd";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import { useTranslations } from "next-intl";
import { FaEye, FaEyeSlash } from "react-icons/fa";

interface Props {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => void;
}

export default function ChangePasswordModal({
  open,
  loading,
  onClose,
  onSubmit,
}: Props) {
  const t = useTranslations("ChangePasswordModal");
  const [form] = Form.useForm();
  const validation = useValidationMessages();

  return (
    <Modal
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      footer={null}
      centered
      width="min(480px, calc(100vw - 24px))"
      destroyOnHidden
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">{t("title")}</span>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        requiredMark={false}
        className="flex flex-col gap-1"
      >
        <Form.Item
          name="old_password"
          label={
            <span className="text-gray-800 text-sm font-medium">
              {t("currentPassword")} <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("oldPassword")),
            },
            {
              min: 6,
              message: validation.minChars(validation.field("oldPassword"), 6),
            },
          ]}
        >
          <Input.Password
            placeholder={t("currentPasswordPlaceholder")}
            iconRender={(visible) =>
              visible ? <FaEye size={18} /> : <FaEyeSlash size={18} />
            }
            className="shadow-sm rounded-md text-sm py-2 px-3"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="new_password"
          label={
            <span className="text-gray-800 text-sm font-medium">
              {t("newPassword")} <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("newPassword")),
            },
            {
              min: 6,
              message: validation.minChars(validation.field("newPassword"), 6),
            },
          ]}
        >
          <Input.Password
            placeholder={t("newPasswordPlaceholder")}
            iconRender={(visible) =>
              visible ? <FaEye size={18} /> : <FaEyeSlash size={18} />
            }
            className="shadow-sm rounded-md text-sm py-2 px-3"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="confirm_password"
          dependencies={["new_password"]}
          label={
            <span className="text-gray-800 text-sm font-medium">
              {t("confirmPassword")} <span className="text-red-500">*</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("confirmPassword")),
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("new_password") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error(validation.passwordMismatch()));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder={t("confirmPasswordPlaceholder")}
            iconRender={(visible) =>
              visible ? <FaEye size={18} /> : <FaEyeSlash size={18} />
            }
            className="shadow-sm rounded-md text-sm py-2 px-3"
            size="large"
          />
        </Form.Item>

        <div className="mt-3 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              form.resetFields();
              onClose();
            }}
            className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer sm:w-auto"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer sm:w-auto"
          >
            {loading ? t("processing") : t("submit")}
          </button>
        </div>
      </Form>
    </Modal>
  );
}
