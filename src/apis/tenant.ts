import axiosRequest from "@/config/axios";
import type {
  UpdateTenantRequest,
  UpdateTenantSettingsRequest,
} from "@/types/request/tenant";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  TenantInfoResponseData,
  TenantSettingsResponseData,
} from "@/types/response/tenant";

export const getTenantInfo = async () => {
  return await axiosRequest.get<ApiResponseEnvelope<TenantInfoResponseData>>(
    "",
  );
};

export const updateTenantInfo = async (data: UpdateTenantRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>("", data);
};

export const getTenantSettings = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<TenantSettingsResponseData>
  >("/settings");
};

export const updateTenantSettings = async (
  data: UpdateTenantSettingsRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/settings",
    data,
  );
};
