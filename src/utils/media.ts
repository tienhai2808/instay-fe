import { STORAGE_PUBLIC_BASE_URL } from "@/constants/storage";

export const resolvePublicImageUrl = (value?: string | null) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || !STORAGE_PUBLIC_BASE_URL) return value;

  const key = value.replace(/^\//, "");
  return `${STORAGE_PUBLIC_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;
};

export const inferImageKeyFromSrc = (src?: string | null) => {
  if (!src) return null;
  if (!/^https?:\/\//i.test(src)) return src.replace(/^\//, "");

  const prefix = `${STORAGE_PUBLIC_BASE_URL}/`;
  if (!STORAGE_PUBLIC_BASE_URL || !src.startsWith(prefix)) return null;

  try {
    return decodeURIComponent(new URL(src).pathname.slice(new URL(prefix).pathname.length));
  } catch {
    return null;
  }
};
