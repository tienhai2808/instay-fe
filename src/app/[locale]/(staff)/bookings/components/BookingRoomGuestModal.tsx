"use client";

import { useEffect } from "react";
import { DatePicker, Form, Input, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type { BookingRoomGuest } from "@/types/data/booking_room";

export type GuestModalMode = "create" | "edit";

export interface GuestFormSubmitValues {
  full_name: string;
  dob: string;
  national: string;
  passport_number: string;
}

interface GuestFormValues {
  full_name: string;
  dob?: Dayjs;
  national: string;
  passport_number: string;
}

interface BookingRoomGuestModalProps {
  open: boolean;
  mode: GuestModalMode;
  guest?: BookingRoomGuest | null;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: GuestFormSubmitValues) => void;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

export default function BookingRoomGuestModal({
  open,
  mode,
  guest,
  submitting = false,
  onCancel,
  onSubmit,
}: BookingRoomGuestModalProps) {
  const t = useTranslations("BookingsPage");
  const validation = useValidationMessages();
  const [form] = Form.useForm<GuestFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (mode === "edit" && guest) {
      const parsedDob = guest.dob ? dayjs(guest.dob) : null;
      form.setFieldsValue({
        full_name: guest.full_name || "",
        dob: parsedDob && parsedDob.isValid() ? parsedDob : undefined,
        national: guest.national || "",
        passport_number: guest.passport_number || "",
      });
      return;
    }

    form.resetFields();
  }, [form, guest, mode, open]);

  const handleSubmit = async () => {
    if (submitting) return;

    const values = await form.validateFields();
    if (!values.dob) return;

    onSubmit({
      full_name: values.full_name.trim(),
      dob: values.dob.startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
      national: values.national.trim(),
      passport_number: values.passport_number.trim(),
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnHidden
      width="min(620px, calc(100vw - 24px))"
      title={
        <span className="text-xl font-bold text-gray-800">
          {t(`detailPage.bookingRoomDetailsModal.guestModal.title.${mode}`)}
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
          name="full_name"
          label={
            <span className="text-sm font-medium">
              {t(
                "detailPage.bookingRoomDetailsModal.guestModal.fields.fullName",
              )}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              whitespace: true,
              message: validation.required(validation.field("guestFullName")),
            },
            {
              min: 2,
              message: validation.minChars(
                validation.field("guestFullName"),
                2,
              ),
            },
          ]}
        >
          <Input
            placeholder={t(
              "detailPage.bookingRoomDetailsModal.guestModal.placeholders.fullName",
            )}
            className={inputClassName}
            maxLength={255}
          />
        </Form.Item>

        <Form.Item
          name="dob"
          label={
            <span className="text-sm font-medium">
              {t("detailPage.bookingRoomDetailsModal.guestModal.fields.dob")}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              message: validation.required(validation.field("dateOfBirth")),
            },
          ]}
        >
          <DatePicker
            format="DD/MM/YYYY"
            placeholder={t(
              "detailPage.bookingRoomDetailsModal.guestModal.placeholders.dob",
            )}
            className={inputClassName}
            disabledDate={(current) =>
              Boolean(current && current.endOf("day").isAfter(dayjs()))
            }
          />
        </Form.Item>

        <Form.Item
          name="national"
          label={
            <span className="text-sm font-medium">
              {t(
                "detailPage.bookingRoomDetailsModal.guestModal.fields.national",
              )}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              whitespace: true,
              message: validation.required(validation.field("nationality")),
            },
            {
              min: 2,
              message: validation.minChars(validation.field("nationality"), 2),
            },
          ]}
        >
          <Input
            placeholder={t(
              "detailPage.bookingRoomDetailsModal.guestModal.placeholders.national",
            )}
            className={inputClassName}
            maxLength={120}
          />
        </Form.Item>

        <Form.Item
          name="passport_number"
          label={
            <span className="text-sm font-medium">
              {t(
                "detailPage.bookingRoomDetailsModal.guestModal.fields.passport",
              )}
              <span className="text-red-500"> *</span>
            </span>
          }
          rules={[
            {
              required: true,
              whitespace: true,
              message: validation.required(validation.field("passportNumber")),
            },
            {
              max: 12,
              message: t(
                "detailPage.bookingRoomDetailsModal.guestModal.validation.passportMax",
                { max: 10 },
              ),
            },
          ]}
        >
          <Input
            placeholder={t(
              "detailPage.bookingRoomDetailsModal.guestModal.placeholders.passport",
            )}
            className={inputClassName}
            maxLength={12}
          />
        </Form.Item>
      </Form>

      <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-full cursor-pointer rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {t("detailPage.bookingRoomDetailsModal.actions.cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full cursor-pointer rounded-md bg-[#0a0a0a] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {submitting
            ? t(
                "detailPage.bookingRoomDetailsModal.guestModal.actions.processing",
              )
            : t(
                `detailPage.bookingRoomDetailsModal.guestModal.actions.${mode === "create" ? "create" : "update"}`,
              )}
        </button>
      </div>
    </Modal>
  );
}
