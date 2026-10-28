"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, Modal, Spin } from "antd";
import dayjs from "dayjs";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { verifyBookingRoomCode } from "@/apis/booking_room";
import { createCustomer } from "@/apis/customer";
import { LOCALE_VI } from "@/constants/locale";
import {
  GUEST_DEFAULT_ROUTE,
  ANONYMOUS_DEFAULT_ROUTE,
} from "@/constants/route-domains";
import { useGuestStore } from "@/stores/useGuestStore";

type CustomerGenderOption = "male" | "female";

const PHONE_PATTERN = /^\d{10,20}$/;

export default function QRCodePage() {
  const locale = useLocale();
  const params = useParams<{ code?: string | string[] }>();
  const codeParam = params?.code;
  const code = Array.isArray(codeParam) ? codeParam[0] : codeParam;
  const currentYear = dayjs().year();
  const minBirthYear = currentYear - 90;
  const maxBirthYear = currentYear - 10;
  const [isVerifying, setIsVerifying] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [gender, setGender] = useState<CustomerGenderOption | null>(null);
  const [phone, setPhone] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVi = locale === LOCALE_VI;
  const labels = useMemo(
    () =>
      isVi
        ? {
            verifying: "Đang xác thực mã...",
            modalTitle: "Cập nhật nhanh thông tin của bạn",
            modalSubtitle: "Bạn có thể bỏ qua bước này.",
            birthYearLabel: "Năm sinh",
            birthYearPlaceholder: "Chọn năm sinh",
            birthYearHint: `Vui lòng chọn năm sinh từ ${minBirthYear} đến ${maxBirthYear}.`,
            genderLabel: "Giới tính",
            male: "Nam",
            female: "Nữ",
            phoneLabel: "Số điện thoại",
            phonePlaceholder: "Nhập số điện thoại",
            phoneHint: "Số điện thoại gồm 10 đến 20 chữ số.",
            skip: "Bỏ qua",
            submit: "Xác nhận",
            submitting: "Đang lưu...",
            requiredError:
              "Vui lòng chọn năm sinh, giới tính và nhập số điện thoại hợp lệ.",
            submitError:
              "Không thể lưu thông tin lúc này. Bạn có thể thử lại hoặc bỏ qua.",
          }
        : {
            verifying: "Verifying QR code...",
            modalTitle: "Quickly update your information",
            modalSubtitle: "You can skip this step.",
            birthYearLabel: "Birth year",
            birthYearPlaceholder: "Select birth year",
            birthYearHint: `Please choose a year from ${minBirthYear} to ${maxBirthYear}.`,
            genderLabel: "Gender",
            male: "Male",
            female: "Female",
            phoneLabel: "Phone number",
            phonePlaceholder: "Enter phone number",
            phoneHint: "Phone number must contain 10 to 20 digits.",
            skip: "Skip",
            submit: "Confirm",
            submitting: "Saving...",
            requiredError:
              "Please choose birth year, gender, and enter a valid phone number.",
            submitError:
              "Could not save your information right now. Please try again or skip.",
          },
    [isVi, maxBirthYear, minBirthYear],
  );

  const normalizedPhone = phone.trim();
  const isPhoneValid = PHONE_PATTERN.test(normalizedPhone);
  const isBirthYearValid =
    birthYear != null && birthYear >= minBirthYear && birthYear <= maxBirthYear;
  const canSubmit =
    isBirthYearValid && Boolean(gender) && isPhoneValid && !isSubmitting;

  const redirectToGuest = useCallback(() => {
    window.location.replace(GUEST_DEFAULT_ROUTE);
  }, []);

  const skipCustomerInfo = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
    redirectToGuest();
  }, [isSubmitting, redirectToGuest]);

  useEffect(() => {
    if (!code?.trim()) {
      window.location.replace(ANONYMOUS_DEFAULT_ROUTE);
      return;
    }

    let cancelled = false;

    const verifyCode = async () => {
      try {
        setIsVerifying(true);
        const response = await verifyBookingRoomCode({
          code: code.trim(),
        });

        if (!cancelled) {
          const bookingRoom = response.data.data.booking_room || null;
          useGuestStore.getState().setGuestVerifiedBookingRoom(bookingRoom);
          setBirthYear(null);
          setGender(null);
          setPhone("");
          setSubmitError("");
          setModalOpen(true);
          setIsVerifying(false);
        }
      } catch {
        if (!cancelled) {
          setIsVerifying(false);
          window.location.replace(ANONYMOUS_DEFAULT_ROUTE);
        }
      }
    };

    void verifyCode();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!isBirthYearValid || !gender || !isPhoneValid) {
      setSubmitError(labels.requiredError);
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await createCustomer({
        birth_year: birthYear,
        gender,
        phone: normalizedPhone,
      });
      setModalOpen(false);
      redirectToGuest();
    } catch {
      setSubmitError(labels.submitError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen items-center justify-center">
        {isVerifying ? (
          <div className="flex flex-col items-center gap-3 text-[#4b5563]">
            <Spin size="large" />
            <p className="text-sm">{labels.verifying}</p>
          </div>
        ) : null}
      </div>

      <Modal
        open={modalOpen}
        onCancel={skipCustomerInfo}
        footer={null}
        centered
        destroyOnHidden
        maskClosable={!isSubmitting}
        closable={!isSubmitting}
        keyboard={!isSubmitting}
        width="min(520px, calc(100vw - 24px))"
        title={
          <div className="space-y-1">
            <p className="text-xl font-bold text-[#111827]">
              {labels.modalTitle}
            </p>
            <p className="text-sm font-normal text-[#6b7280]">
              {labels.modalSubtitle}
            </p>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-[#111827]">
              {labels.birthYearLabel}
            </p>
            <DatePicker
              picker="year"
              format="YYYY"
              allowClear
              value={birthYear ? dayjs(`${birthYear}-01-01`) : null}
              placeholder={labels.birthYearPlaceholder}
              className="h-11 w-full"
              disabled={isSubmitting}
              disabledDate={(current) => {
                if (!current) return false;
                const year = current.year();
                return year < minBirthYear || year > maxBirthYear;
              }}
              onChange={(value) => {
                setBirthYear(value ? value.year() : null);
                setSubmitError("");
              }}
            />
            <p className="mt-2 text-xs text-[#6b7280]">
              {labels.birthYearHint}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-[#111827]">
              {labels.genderLabel}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "male", label: labels.male },
                  { value: "female", label: labels.female },
                ] as const
              ).map((option) => {
                const selected = gender === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setGender(option.value);
                      setSubmitError("");
                    }}
                    className={`h-11 rounded-lg border text-sm font-medium transition ${
                      selected
                        ? "border-[#111827] bg-[#111827] text-white"
                        : "border-[#d1d5db] bg-white text-[#111827] hover:border-[#9ca3af]"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#111827]">
              {labels.phoneLabel}
            </label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              disabled={isSubmitting}
              placeholder={labels.phonePlaceholder}
              onChange={(event) => {
                const normalized = event.target.value.replace(/\D+/g, "");
                setPhone(normalized.slice(0, 20));
                setSubmitError("");
              }}
              className="h-11 w-full rounded-lg border border-[#d1d5db] px-3 text-sm text-[#111827] outline-none transition focus:border-[#111827] focus:ring-2 focus:ring-[#111827]/10 disabled:cursor-not-allowed disabled:bg-[#f9fafb]"
            />
            <p
              className={`mt-2 text-xs ${
                normalizedPhone.length > 0 && !isPhoneValid
                  ? "text-[#dc2626]"
                  : "text-[#6b7280]"
              }`}
            >
              {labels.phoneHint}
            </p>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
              {submitError}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={skipCustomerInfo}
              className="h-10 rounded-md border border-[#d1d5db] bg-white px-4 text-sm font-medium text-[#111827] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {labels.skip}
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-10 rounded-md bg-[#111827] px-4 text-sm font-medium text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? labels.submitting : labels.submit}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
