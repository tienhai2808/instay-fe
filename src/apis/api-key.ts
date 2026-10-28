import axiosRequest from "@/config/axios";
import type { CreateApiKeyResponseData } from "@/types/response/api-key";

export const createApiKey = async () => {
  return await axiosRequest.post<CreateApiKeyResponseData>("/api-keys", {});
};
