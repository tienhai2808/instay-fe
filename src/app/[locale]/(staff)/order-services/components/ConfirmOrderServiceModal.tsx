"use client";

import { Form, Input, Modal } from "antd";
import { useTranslations } from "next-intl";

interface ConfirmOrderServiceModalValues {
  staff_note?: string;
}

interface ConfirmOrderServiceModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: { staff_note?: string }) => void | Promise<void>;
}

export default function ConfirmOrderServiceModal({
  open,
  loading = false,
  onClose,
  onConfirm,
}: ConfirmOrderServiceModalProps) {
  const t = useTranslations("OrderServicesPage");
  const [form] = Form.useForm<ConfirmOrderServiceModalValues>();

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
      width="min(520px, calc(100vw - 24px))"
      destroyOnHidden
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 16 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">
          {t("detailPage.confirmModal.title")}
        </span>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        {t("detailPage.confirmModal.confirmText")}
      </p>

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onConfirm({
            staff_note: values.staff_note?.trim() || undefined,
          })
        }
        className="flex flex-col gap-1"
      >
        <Form.Item
          name="staff_note"
          label={
            <span className="text-gray-800 text-sm font-medium">
              {t("detailPage.confirmModal.staffNoteLabel")}
            </span>
          }
        >
          <Input.TextArea
            placeholder={t("detailPage.confirmModal.staffNotePlaceholder")}
            className="shadow-sm rounded-md text-sm py-2 px-3"
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <div className="mt-2 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="w-full px-6 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {t("detailPage.actions.cancel")}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer sm:w-auto"
          >
            {loading
              ? t("detailPage.confirmModal.processing")
              : t("detailPage.confirmModal.submit")}
          </button>
        </div>
      </Form>
    </Modal>
  );
}
