"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTenantInfo } from "@/apis/tenant";
import { queryKeys } from "@/constants/query-keys";
import { useTenantStore } from "@/stores/useTenantStore";

export default function TenantProvider() {
  const tenant = useTenantStore((state) => state.tenant);
  const hasHydrated = useTenantStore((state) => state.hasHydrated);
  const setTenant = useTenantStore((state) => state.setTenant);

  const { data: tenantRes } = useQuery({
    queryKey: queryKeys.tenant.detail(),
    queryFn: async () => getTenantInfo(),
    enabled: hasHydrated && !tenant,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const nextTenant = tenantRes?.data?.data?.tenant;
    if (!nextTenant) return;
    setTenant(nextTenant);
  }, [setTenant, tenantRes?.data?.data?.tenant]);

  return null;
}
