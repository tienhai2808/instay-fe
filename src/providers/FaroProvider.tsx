"use client";

import { useEffect } from "react";
import { getWebInstrumentations, initializeFaro } from "@grafana/faro-web-sdk";
import { getFaroBrowserConfig } from "@/config/faro";
import { ensureFaro, syncFaroIdentity } from "@/services/monitoring/faro";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTenantStore } from "@/stores/useTenantStore";

export default function FaroProvider() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const tenant = useTenantStore((state) => state.tenant);

  useEffect(() => {
    const config = getFaroBrowserConfig();
    if (!config.enabled) return;

    ensureFaro(() =>
      initializeFaro({
        url: config.url,
        apiKey: config.apiKey,
        app: config.app,
        instrumentations: [
          ...getWebInstrumentations({
            captureConsole: config.captureConsole,
          }),
        ],
        experimental: {
          trackNavigation: true,
        },
      }),
    );
  }, []);

  useEffect(() => {
    syncFaroIdentity({
      isAuthenticated,
      user,
      tenant,
    });
  }, [isAuthenticated, tenant, user]);

  return null;
}
