import type { GetServicesRequest } from "@/types/request/service";

export const servicesQueryKeys = {
  all: ["services"] as const,
  list: (params: GetServicesRequest) =>
    [...servicesQueryKeys.all, "list", params] as const,
  detail: (id: string) => [...servicesQueryKeys.all, "detail", id] as const,
};

export const serviceTypesQueryKeys = {
  all: ["service-types"] as const,
  basic: () => [...serviceTypesQueryKeys.all, "basic"] as const,
};
