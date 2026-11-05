import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const publicStorageUrl = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_BASE_URL?.trim();
const storagePattern = publicStorageUrl
  ? new URL(`${publicStorageUrl.replace(/\/+$/, "")}/**`)
  : undefined;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: storagePattern ? [storagePattern] : [],
  },
};

export default withNextIntl(nextConfig);
