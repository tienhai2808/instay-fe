import { GCS_PUBLIC_PREFIX } from "@/constants/storage";

export const resolvePublicImageUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;

  if (!GCS_PUBLIC_PREFIX) return value;
  const prefix = GCS_PUBLIC_PREFIX.endsWith("/")
    ? GCS_PUBLIC_PREFIX
    : `${GCS_PUBLIC_PREFIX}/`;
  const key = value.startsWith("/") ? value.slice(1) : value;
  return `${prefix}${key}`;
};
