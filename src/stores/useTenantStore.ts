import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Tenant } from "@/types/data/tenant";

interface TenantState {
  tenant: Tenant | null;
  hasHydrated: boolean;
  setTenant: (tenant: Tenant | null) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenant: null,
      hasHydrated: false,
      setTenant: (tenant: Tenant | null) => set({ tenant }),
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
    }),
    {
      name: "instay:tenant",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tenant: state.tenant,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
