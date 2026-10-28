import type { Tenant, TenantSettings } from "@/types/data/tenant";

export interface TenantInfoResponseData {
  tenant?: Tenant;
}

export interface TenantSettingsResponseData {
  settings?: TenantSettings;
}
