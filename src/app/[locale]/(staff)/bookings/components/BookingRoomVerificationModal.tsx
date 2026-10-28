"use client";

import { Modal, Spin } from "antd";
import { useTranslations } from "next-intl";
import {
  EMPTY_VALUE,
  formatEnumLabel,
} from "../utils/booking-room-details-modal";

interface BookingRoomVerificationModalProps {
  open: boolean;
  verificationUrl: string;
  sessionId?: string;
  verificationStatus?: string;
  onCancel: () => void;
}

export default function BookingRoomVerificationModal({
  open,
  verificationUrl,
  sessionId,
  verificationStatus,
  onCancel,
}: BookingRoomVerificationModalProps) {
  const t = useTranslations("BookingsPage");

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnHidden
      width="min(520px, calc(100vw - 24px))"
      title={
        <span className="text-lg font-semibold text-gray-900">
          {t("detailPage.bookingRoomDetailsModal.verification.title")}
        </span>
      }
      styles={{
        body: { padding: 0 },
        header: { marginBottom: 12 },
      }}
    >
      <div className="h-[78vh] min-h-[520px] max-h-[760px] overflow-hidden">
        {verificationUrl ? (
          <iframe
            src={verificationUrl}
            title={t("detailPage.bookingRoomDetailsModal.verification.title")}
            className="h-full w-full border-0"
            allow="camera; microphone; fullscreen; autoplay; encrypted-media"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spin size="large" />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500">
          {t("detailPage.bookingRoomDetailsModal.verification.sessionId", {
            sessionId: sessionId || EMPTY_VALUE,
          })}
        </p>
        {verificationStatus ? (
          <p className="mt-1 text-xs text-gray-500">
            {t("detailPage.bookingRoomDetailsModal.verification.status", {
              status: formatEnumLabel(verificationStatus),
            })}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
