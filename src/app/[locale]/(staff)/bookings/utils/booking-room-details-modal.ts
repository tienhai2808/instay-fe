import type {
  BookingRoomDetails,
  BookingRoomGuest,
  BookingRoomOrderService,
  BookingRoomReview,
  BookingRoomSupportTicket,
} from "@/types/data/booking_room";

export const EMPTY_VALUE = "-";

export const DIDIT_DEFAULT_ORIGINS = [
  "https://verify.didit.me",
  "https://verification.didit.me",
];

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const nextValue = value.trim();
  return nextValue || undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const toServiceDiscountType = (value: unknown) => {
  if (value === "percent" || value === "amount") return value;
  return undefined;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

const toParsedRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return toRecord(parsed);
    } catch {
      return null;
    }
  }

  return toRecord(value);
};

export const normalizeGuests = (value: unknown): BookingRoomGuest[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;

      const id = toStringValue(record.id);
      if (!id) return null;

      return {
        id,
        full_name: toOptionalString(record.full_name),
        dob: toOptionalString(record.dob),
        national: toOptionalString(record.national),
        passport_number: toOptionalString(record.passport_number),
      } as BookingRoomGuest;
    })
    .filter((guest): guest is BookingRoomGuest => Boolean(guest));
};

const normalizeOrderServices = (value: unknown): BookingRoomOrderService[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;

      const id = toStringValue(record.id);
      if (!id) return null;

      const serviceRecord = toRecord(record.service);
      const serviceId = serviceRecord ? toStringValue(serviceRecord.id) : null;

      return {
        id,
        service: serviceRecord
          ? {
              id: serviceId || EMPTY_VALUE,
              name: toOptionalString(serviceRecord.name),
              slug: toOptionalString(serviceRecord.slug),
              price: toNumberValue(serviceRecord.price),
              discount_type: toServiceDiscountType(serviceRecord.discount_type),
              discount_value: toNumberValue(serviceRecord.discount_value),
              discount_start_at: toOptionalString(
                serviceRecord.discount_start_at,
              ),
              discount_end_at: toOptionalString(serviceRecord.discount_end_at),
            }
          : null,
        quantity: toNumberValue(record.quantity),
        unit_price: toNumberValue(record.unit_price),
        total_price: toNumberValue(record.total_price),
        status: toOptionalString(record.status),
        estimated_at: toOptionalString(record.estimated_at),
        guest_note: toOptionalString(record.guest_note),
      } as BookingRoomOrderService;
    })
    .filter((orderService): orderService is BookingRoomOrderService =>
      Boolean(orderService),
    );
};

const normalizeSupportTickets = (
  value: unknown,
): BookingRoomSupportTicket[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = toRecord(item);
      if (!record) return null;

      const id = toStringValue(record.id);
      if (!id) return null;

      const categoryRecord = toRecord(record.support_category);
      const categoryId = categoryRecord ? toStringValue(categoryRecord.id) : "";

      return {
        id,
        support_category: categoryRecord
          ? {
              id: categoryId || EMPTY_VALUE,
              name: toOptionalString(categoryRecord.name),
            }
          : null,
        content: toOptionalString(record.content),
        status: toOptionalString(record.status),
        priority: toOptionalString(record.priority),
        created_at: toOptionalString(record.created_at),
      } as BookingRoomSupportTicket;
    })
    .filter((ticket): ticket is BookingRoomSupportTicket => Boolean(ticket));
};

const normalizeReview = (value: unknown): BookingRoomReview | null => {
  const record = toRecord(value);
  if (!record) return null;

  const id = toStringValue(record.id);
  if (!id) return null;

  const star = toNumberValue(record.star);
  const safeStar =
    typeof star === "number" ? Math.max(0, Math.min(5, star)) : undefined;

  return {
    id,
    star: safeStar,
    content: toOptionalString(record.content),
  };
};

export const getBookingRoomDetailsFromPayload = (
  payload: unknown,
): BookingRoomDetails | null => {
  const payloadRecord = toRecord(payload);
  if (!payloadRecord) return null;

  const bookingRoomCandidate =
    "booking_room" in payloadRecord ? payloadRecord.booking_room : payload;
  const bookingRoomRecord = toRecord(bookingRoomCandidate);
  if (!bookingRoomRecord) return null;

  const id = toStringValue(bookingRoomRecord.id);
  if (!id) return null;

  return {
    id,
    guests: normalizeGuests(bookingRoomRecord.guests),
    order_services: normalizeOrderServices(bookingRoomRecord.order_services),
    support_tickets: normalizeSupportTickets(bookingRoomRecord.support_tickets),
    review: normalizeReview(bookingRoomRecord.review),
  };
};

export const formatEnumLabel = (value?: string) => {
  const nextValue = (value || "").trim();
  if (!nextValue) return EMPTY_VALUE;

  return nextValue
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const getStateTagClassName = (value?: string) => {
  const normalized = (value || "").trim().toLocaleLowerCase();

  if (
    normalized.includes("success") ||
    normalized.includes("resolved") ||
    normalized.includes("completed") ||
    normalized.includes("done")
  ) {
    return "!border-green-200 !bg-green-50 !text-green-700";
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("rejected") ||
    normalized.includes("failed") ||
    normalized.includes("error")
  ) {
    return "!border-red-200 !bg-red-50 !text-red-700";
  }

  if (
    normalized.includes("in_progress") ||
    normalized.includes("in-progress") ||
    normalized.includes("processing") ||
    normalized.includes("ongoing")
  ) {
    return "!border-blue-200 !bg-blue-50 !text-blue-700";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("waiting") ||
    normalized.includes("new")
  ) {
    return "!border-amber-200 !bg-amber-50 !text-amber-700";
  }

  return "!border-gray-200 !bg-gray-50 !text-gray-700";
};

export interface GuestVerificationSessionMeta {
  sessionId?: string;
  verificationUrl?: string;
}

export const getGuestVerificationSessionMeta = (
  payload: unknown,
): GuestVerificationSessionMeta => {
  const record = toRecord(payload);
  if (!record) return {};

  return {
    sessionId:
      toStringValue(record.session_id) || toStringValue(record.sessionId),
    verificationUrl:
      toOptionalString(record.verification_url) ||
      toOptionalString(record.verificationUrl),
  };
};

export const isVerificationSuccessStatus = (status?: string) => {
  const normalized = (status || "").trim().toLocaleLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("approved") ||
    normalized.includes("success") ||
    normalized.includes("completed") ||
    normalized.includes("complete") ||
    normalized.includes("verified")
  );
};

export const isVerificationFailureStatus = (status?: string) => {
  const normalized = (status || "").trim().toLocaleLowerCase();
  if (!normalized) return false;

  return (
    normalized.includes("declin") ||
    normalized.includes("reject") ||
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("cancel")
  );
};

interface DiditMessageMeta {
  type?: string;
  status?: string;
  sessionId?: string;
}

export const extractDiditMessageMeta = (payload: unknown): DiditMessageMeta => {
  const directRecord = toParsedRecord(payload);
  if (!directRecord) return {};

  const candidateRecords = [
    directRecord,
    toParsedRecord(directRecord.data),
    toParsedRecord(directRecord.payload),
    toParsedRecord(directRecord.message),
  ].filter((record): record is Record<string, unknown> => Boolean(record));

  for (const record of candidateRecords) {
    const type =
      toStringValue(record.type) ||
      toStringValue(record.event) ||
      toStringValue(record.event_type) ||
      toStringValue(record.action);
    const status =
      toStringValue(record.status) ||
      toStringValue(record.verification_status) ||
      toStringValue(record.result) ||
      toStringValue(record.outcome);
    const sessionId =
      toStringValue(record.sessionId) ||
      toStringValue(record.session_id) ||
      toStringValue(record.id);

    if (type || status || sessionId) {
      return { type, status, sessionId };
    }
  }

  return {};
};

export const hasDiditCompletionSignal = (type?: string, status?: string) => {
  const normalizedType = (type || "").trim().toLocaleLowerCase();
  const normalizedStatus = (status || "").trim().toLocaleLowerCase();

  const completionByType =
    normalizedType.includes("complete") ||
    normalizedType.includes("completed") ||
    normalizedType.includes("approved") ||
    normalizedType.includes("success") ||
    normalizedType.includes("reject") ||
    normalizedType.includes("decline") ||
    normalizedType.includes("fail") ||
    normalizedType.includes("error") ||
    normalizedType.includes("cancel");

  const completionByStatus =
    isVerificationSuccessStatus(normalizedStatus) ||
    isVerificationFailureStatus(normalizedStatus);
  return completionByType || completionByStatus;
};

export const isAllowedDiditOrigin = (
  origin: string,
  allowedOrigins: Set<string>,
  verificationUrl?: string,
) => {
  if (allowedOrigins.has(origin)) return true;

  try {
    const parsedOrigin = new URL(origin);
    const hostname = parsedOrigin.hostname.toLocaleLowerCase();
    if (hostname === "didit.me" || hostname.endsWith(".didit.me")) return true;
  } catch {
    return false;
  }

  if (!verificationUrl) return false;

  try {
    const parsedVerificationUrl = new URL(verificationUrl);
    return parsedVerificationUrl.origin === origin;
  } catch {
    return false;
  }
};
