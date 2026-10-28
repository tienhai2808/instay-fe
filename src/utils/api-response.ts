import { getCookie } from "@/utils/cookies";
import {
  AppLocale,
  NEXT_LOCALE_COOKIE,
  resolveLocale,
} from "@/constants/locale";
import responseMap from "../messages/response.json";

type LocalizedText = {
  en?: string;
  vi?: string;
};

type ApiPayload = {
  code?: number;
  message?: string;
  data?: unknown;
};

type BindingErrorData = {
  field?: string;
  tag?: string;
  param?: string;
};

type ResponseMap = {
  success_codes: Record<string, LocalizedText>;
  error_codes: Record<string, LocalizedText>;
  binding_errors: Record<string, LocalizedText>;
  field_names: Record<string, LocalizedText>;
  notification_codes: Record<string, LocalizedText>;
};

const map = responseMap as ResponseMap;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getLocale = (): AppLocale => {
  const locale = getCookie(NEXT_LOCALE_COOKIE);
  return resolveLocale(locale ?? null);
};

const normalizeCode = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
};

const normalizeFieldKey = (field: unknown) => {
  if (typeof field !== "string" || !field.trim()) return "unknown";
  return field.toLowerCase().replace(/[^a-z0-9]/g, "");
};

const fillTemplate = (template: string, values: Record<string, string>) => {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
};

const getLocalized = (value: LocalizedText | undefined, locale: AppLocale) => {
  return value?.[locale] || value?.en || value?.vi || "";
};

const extractApiPayload = (input: unknown): ApiPayload | null => {
  if (!isObject(input)) return null;

  if (
    "response" in input &&
    isObject(input.response) &&
    "data" in input.response &&
    isObject(input.response.data)
  ) {
    return input.response.data as ApiPayload;
  }

  if (
    "data" in input &&
    isObject(input.data) &&
    ("code" in input.data || "message" in input.data || "data" in input.data)
  ) {
    return input.data as ApiPayload;
  }

  if ("code" in input || "message" in input || "data" in input) {
    return input as ApiPayload;
  }

  return null;
};

const getBindingErrors = (data: unknown): BindingErrorData[] => {
  if (Array.isArray(data)) {
    return data.filter(isObject) as BindingErrorData[];
  }

  if (isObject(data) && ("tag" in data || "field" in data || "param" in data)) {
    return [data as BindingErrorData];
  }

  return [];
};

const resolveBindingErrorMessage = (payload: ApiPayload, locale: AppLocale) => {
  const bindingErrors = getBindingErrors(payload.data);
  if (bindingErrors.length === 0)
    return getLocalized(map.error_codes["4000"], locale);

  const unknownField =
    getLocalized(map.field_names.unknown, locale) || "Unknown";
  const fallbackTemplate =
    getLocalized(map.binding_errors.invalid, locale) ||
    getLocalized(map.error_codes["4000"], locale);

  const messages = bindingErrors.map((item) => {
    const fieldKey = normalizeFieldKey(item.field);
    const fieldName =
      getLocalized(map.field_names[fieldKey], locale) || unknownField;
    const tagKey =
      typeof item.tag === "string" ? item.tag.toLowerCase() : "invalid";
    const template =
      getLocalized(map.binding_errors[tagKey], locale) || fallbackTemplate;

    return fillTemplate(template, {
      field: fieldName,
      param: item.param != null ? String(item.param) : "",
    });
  });

  return messages.join(". ");
};

export const getApiCode = (input: unknown) => {
  const payload = extractApiPayload(input);
  return normalizeCode(payload?.code);
};

export const resolveApiMessage = (input: unknown) => {
  const locale = getLocale();
  const payload = extractApiPayload(input);

  if (!payload) {
    if (typeof input === "string") return input;
    if (input instanceof Error) return input.message;
    return "";
  }

  const code = normalizeCode(payload.code);
  if (code === 1000) return "";

  if (code != null && code >= 1000 && code < 2000) {
    const mappedSuccess = getLocalized(map.success_codes[String(code)], locale);
    if (mappedSuccess) return mappedSuccess;
  }

  if (code === 4000) {
    return resolveBindingErrorMessage(payload, locale);
  }

  if (typeof code === "number") {
    const mappedError = getLocalized(map.error_codes[String(code)], locale);
    if (mappedError) return mappedError;

    const mappedNotification = getLocalized(
      map.notification_codes[String(code)],
      locale,
    );
    if (mappedNotification) return mappedNotification;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return "";
};

export const resolveApiErrorMessage = (
  input: unknown,
  fallbackMessage?: string,
) => {
  const locale = getLocale();
  const defaultMessage =
    getLocalized(map.error_codes["5000"], locale) || "Internal server error";
  const message = resolveApiMessage(input);
  if (
    message &&
    !/^Request failed with status code \d+$/i.test(message.trim())
  ) {
    return message;
  }
  return fallbackMessage || defaultMessage;
};
