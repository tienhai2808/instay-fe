import type { GetEventsRequest } from "@/types/request/event";

export const eventQueryKeys = {
  all: ["events"] as const,
  list: (params: GetEventsRequest) =>
    [...eventQueryKeys.all, "list", params] as const,
  detail: (id: string) => [...eventQueryKeys.all, "detail", id] as const,
};
