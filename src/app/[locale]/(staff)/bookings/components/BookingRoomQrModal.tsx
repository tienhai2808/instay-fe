"use client";

import { useRef } from "react";
import { Modal, QRCode } from "antd";
import { useTranslations } from "next-intl";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";

interface BookingRoomQrModalProps {
  open: boolean;
  bookingRoom: SimpleBookingRoomResponse | null;
  bookingNumber?: string;
  onClose: () => void;
}

export default function BookingRoomQrModal({
  open,
  bookingRoom,
  bookingNumber,
  onClose,
}: BookingRoomQrModalProps) {
  const t = useTranslations("BookingsPage");
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const qrUrl = bookingRoom?.code
    ? typeof window === "undefined"
      ? `/qr/${bookingRoom.code}`
      : `${window.location.origin}/qr/${bookingRoom.code}`
    : "";

  const computedStyleToCssText = (style: CSSStyleDeclaration) => {
    return Array.from(style)
      .map((property) => `${property}:${style.getPropertyValue(property)};`)
      .join("");
  };

  const cloneWithInlineStyles = (sourceNode: HTMLElement) => {
    const cloneNode = sourceNode.cloneNode(true) as HTMLElement;
    const sourceElements = [
      sourceNode,
      ...Array.from(sourceNode.querySelectorAll("*")),
    ];
    const cloneElements = [
      cloneNode,
      ...Array.from(cloneNode.querySelectorAll("*")),
    ];

    sourceElements.forEach((sourceElement, index) => {
      const cloneElement = cloneElements[index];
      if (!cloneElement) return;

      const cssText = computedStyleToCssText(
        window.getComputedStyle(sourceElement),
      );

      if (sourceElement instanceof HTMLCanvasElement) {
        const image = document.createElement("img");
        image.src = sourceElement.toDataURL("image/png");
        image.alt = "QR";
        image.setAttribute("style", cssText);
        cloneElement.replaceWith(image);
        return;
      }

      cloneElement.setAttribute("style", cssText);
    });

    return cloneNode;
  };

  const handlePrint = () => {
    if (!bookingRoom?.code) return;

    const printSourceNode = printAreaRef.current;
    if (!printSourceNode) return;

    const printNode = cloneWithInlineStyles(printSourceNode);
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    const headStyles = Array.from(
      document.head.querySelectorAll("link[rel='stylesheet'], style"),
    )
      .map((node) => node.outerHTML)
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t("detailPage.qrModal.title")}</title>
          ${headStyles}
          <style>
            body { margin: 0; padding: 24px; background: #fff; }
            .print-root { display: flex; justify-content: center; }
            @page { margin: 12mm; }
          </style>
        </head>
        <body>
          <div class="print-root">${printNode.outerHTML}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 120);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
      styles={{
        container: {
          padding: 30,
        },
      }}
      title={
        <div>
          <div className="text-xl text-center font-semibold text-gray-900">
            {t("detailPage.qrModal.title")}
          </div>
          <div className="text-center text-sm! text-gray-500">
            {t("detailPage.qrModal.subtitle")}
          </div>
        </div>
      }
    >
      <div
        ref={printAreaRef}
        className="mt-2 flex flex-col items-center gap-3 mb-2"
      >
        <QRCode
          className="border! border-[#8b5cf6]! p-6! rounded-sm! my-4!"
          value={qrUrl || "-"}
          size={220}
        />

        {!bookingRoom?.code ? (
          <p className="text-center text-sm text-gray-600 break-all">
            {t("detailPage.qrModal.missing")}
          </p>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="font-medium text-gray-800">
              {bookingRoom.room?.name} - {bookingNumber}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handlePrint}
          disabled={!bookingRoom?.code}
          className="cursor-pointer rounded-md bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-600 active:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("detailPage.qrModal.print")}
        </button>
      </div>
    </Modal>
  );
}
