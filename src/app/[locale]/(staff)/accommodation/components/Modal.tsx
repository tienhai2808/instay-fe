"use client";

import { useEffect, useMemo } from "react";
import { DatePicker, Form, Input, Modal } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_VI } from "@/constants/locale";
import { useValidationMessages } from "@/hooks/useValidationMessages";
import type { Guest } from "@/types/data/guest";

interface AccommodationFormValues {
  full_name: string;
  dob?: Dayjs;
  national: string;
  passport_number: string;
}

export interface AccommodationSubmitValues {
  full_name: string;
  dob: string;
  national: string;
  passport_number: string;
  booking_room_id?: string;
}

interface AccommodationModalProps {
  open: boolean;
  guest?: Guest;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: AccommodationSubmitValues) => void;
}

const inputClassName =
  "shadow-sm w-full rounded-lg px-3! py-2! text-sm bg-white focus:outline-none focus:ring-2 transition";

export default function AccommodationModal({
  open,
  guest,
  submitting = false,
  onClose,
  onSubmit,
}: AccommodationModalProps) {
  const t = useTranslations("AccommodationPage");
  const locale = useLocale();
  const validation = useValidationMessages();
  const [form] = Form.useForm<AccommodationFormValues>();

  const watchedFullName = Form.useWatch("full_name", form);
  const watchedDob = Form.useWatch("dob", form);
  const watchedNational = Form.useWatch("national", form);
  const watchedPassportNumber = Form.useWatch("passport_number", form);

  const hasChanges = useMemo(() => {
    if (!guest) return false;

    const initialDob = guest.dob ? dayjs(guest.dob) : null;
    const currentDob = watchedDob || null;

    return (
      (watchedFullName || "").trim() !== (guest.full_name || "") ||
      (watchedNational || "").trim() !== (guest.national || "") ||
      (watchedPassportNumber || "").trim() !== (guest.passport_number || "") ||
      !(
        initialDob &&
        initialDob.isValid() &&
        currentDob &&
        currentDob.isValid() &&
        currentDob.isSame(initialDob, "day")
      )
    );
  }, [
    guest,
    watchedDob,
    watchedFullName,
    watchedNational,
    watchedPassportNumber,
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

  const formatDate = (value?: string) => {
    if (!value) return "--";

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat(locale === LOCALE_VI ? "vi-VN" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return value;
    }
  };

  const getUserDisplayName = (user?: Guest["created_by"]) => {
    if (!user) return "--";

    const fullName = [user.first_name, user.last_name]
      .filter((part): part is string => Boolean(part))
      .join(" ")
      .trim();

    return fullName || user.username || user.email || "--";
  };

  useEffect(() => {
    if (!open || !guest) return;

    const parsedDob = guest.dob ? dayjs(guest.dob) : null;

    form.setFieldsValue({
      full_name: guest.full_name || "",
      dob: parsedDob && parsedDob.isValid() ? parsedDob : undefined,
      national: guest.national || "",
      passport_number: guest.passport_number || "",
    });
  }, [form, guest, open]);

  const handleSubmit = async () => {
    if (submitting || !guest) return;
    const values = await form.validateFields();
    if (!values.dob) return;

    onSubmit({
      full_name: values.full_name.trim(),
      dob: values.dob.startOf("day").format("YYYY-MM-DDTHH:mm:ssZ"),
      national: values.national.trim(),
      passport_number: values.passport_number.trim(),
      booking_room_id: guest.booking_room?.id,
    });
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width="min(680px, calc(100vw - 24px))"
      styles={{
        body: { borderRadius: 16 },
        header: { marginBottom: 24 },
      }}
      title={
        <span className="text-xl font-bold text-gray-800">
          {t("modal.title")}
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
            <span className="text-gray-800 text-sm font-medium">
              {t("form.fullName")}
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
            placeholder={t("form.fullNamePlaceholder")}
            className={inputClassName}
            maxLength={255}
          />
        </Form.Item>

        <Form.Item
          name="dob"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.dob")}
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
            placeholder={t("form.dobPlaceholder")}
            className={inputClassName}
            disabledDate={(current) =>
              Boolean(current && current.endOf("day").isAfter(dayjs()))
            }
          />
        </Form.Item>

        <Form.Item
          name="national"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.national")}
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
            placeholder={t("form.nationalPlaceholder")}
            className={inputClassName}
            maxLength={120}
          />
        </Form.Item>

        <Form.Item
          name="passport_number"
          label={
            <span className="text-sm font-medium block mb-1">
              {t("form.passport")}
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
              max: 10,
              message: t("form.passportMax", { max: 10 }),
            },
          ]}
        >
          <Input
            placeholder={t("form.passportPlaceholder")}
            className={inputClassName}
            maxLength={10}
          />
        </Form.Item>

        {guest ? (
          <div className="mb-2 mt-4 rounded-lg bg-[#f5f5f5] p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-[#374151] mb-3">
              {t("meta.title")}
            </h4>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.bookingRoom")}</p>
                <p className="font-medium text-[#111827]">
                  {guest.booking_room?.room?.name ||
                    guest.booking_room?.code ||
                    (guest.booking_room?.id
                      ? `#${guest.booking_room.id}`
                      : "--")}
                </p>
              </div>

              <div className="sm:text-end"></div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.checkIn")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDate(guest.check_in)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.checkOut")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDate(guest.check_out)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(guest.created_by)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#6B7280] mb-1">{t("meta.updatedBy")}</p>
                <p className="font-medium text-[#111827]">
                  {getUserDisplayName(guest.updated_by)}
                </p>
              </div>

              <div>
                <p className="text-[#6B7280] mb-1">{t("meta.createdAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(guest.created_at)}
                </p>
              </div>

              <div className="sm:text-end">
                <p className="text-[#1b202a] mb-1">{t("meta.updatedAt")}</p>
                <p className="font-medium text-[#111827]">
                  {formatDateTime(guest.updated_at)}
                </p>
              </div>
            </div>
          </div>
        ) : null}
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
          {t("actions.save")}
        </button>
      </div>
    </Modal>
  );
}
