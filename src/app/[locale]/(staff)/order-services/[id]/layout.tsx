import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  isValidNumericEntityId,
  resolveApiNotFound,
} from "@/utils/server/api-not-found-guard";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export default async function OrderServiceDetailLayout({
  children,
  params,
}: Props) {
  const { id } = await params;
  const normalizedId = id.trim();

  if (!isValidNumericEntityId(normalizedId)) {
    notFound();
  }

  const shouldShowNotFound = await resolveApiNotFound({
    path: `/admin/order-services/${encodeURIComponent(normalizedId)}`,
    notFoundCodes: [4016, 4044],
  });

  if (shouldShowNotFound) {
    notFound();
  }

  return children;
}
