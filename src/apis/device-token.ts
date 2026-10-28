import axiosRequest from "@/config/axios";
import { DeviceTokenRequest } from "@/types/request/device-token";
import { ApiResponseEnvelope } from "@/types/response/common";

export const upsertDeviceToken = (deviceToken: string) => {
  const payload: DeviceTokenRequest = {
    device_token: deviceToken,
  };
  return axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/device-tokens",
    payload,
  );
};

export const deleteDeviceToken = (deviceToken: string) => {
  return axiosRequest.delete<ApiResponseEnvelope<unknown>>("/device-tokens", {
    data: { device_token: deviceToken },
  });
};
