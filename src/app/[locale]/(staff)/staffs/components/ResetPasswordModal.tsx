"use client";

import { Form, Input, Modal } from "antd";
import { useTranslations } from "next-intl";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useValidationMessages } from "@/hooks/useValidationMessages";

interface ResetStaffPasswordFormValues {
  new_password: string;
  confirm_password: string;
}

interface ResetStaffPasswordModalProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: { new_password: string }) => void | Promise<void>;
}

export default function ResetStaffPasswordModal({
  open,
  loading,
  onClose,
  onSubmit,
}: ResetStaffPasswordModalProps) {
  const t = useTranslations("StaffsPage");
  const tPasswordModal = useTranslations("ChangePasswordModal");
  const validation = useValidationMessages();
  const [form] = Form.useForm<ResetStaffPasswordFormValues>();

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      width="min(480px, calc(100vw - 24px))"
      destroyOnHidden
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">
          {t("detailPage.resetPasswordModal.title")}
        </span>
      }
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onSubmit({
            new_password: values.new_password,
          })
        }
        className="flex flex-col gap-1"
      >
        <Form.Item
          name="new_password"
          label={
            <span className="text-gray-800 text-sm font-medium">
              {tPasswordModal("newPassword")}{" "}
              <span className="text-red-500">*</span>
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
            placeholder={tPasswordModal("newPasswordPlaceholder")}
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
              {tPasswordModal("confirmPassword")}{" "}
              <span className="text-red-500">*</span>
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
            placeholder={tPasswordModal("confirmPasswordPlaceholder")}
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
            onClick={handleClose}
            className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer sm:w-auto"
          >
            {tPasswordModal("cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2 rounded-md bg-[#8b5cf6] hover:bg-violet-600 active:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer sm:w-auto"
          >
            {loading
              ? tPasswordModal("processing")
              : t("detailPage.resetPasswordModal.submit")}
          </button>
        </div>
      </Form>
    </Modal>
  );
}
