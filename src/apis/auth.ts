import axiosRequest from "@/config/axios";
import {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResendForgotPasswordOtpRequest,
  ResetPasswordRequest,
  UpdateInforRequest,
  VerifyForgotPasswordOtpRequest,
} from "@/types/request/auth";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  ForgotPasswordResponseData,
  LoginResponseData,
  UserInfoResponseData,
  VerifyForgotPasswordOtpResponseData,
} from "@/types/response/auth";

export const login = (data: LoginRequest) => {
  return axiosRequest.post<ApiResponseEnvelope<LoginResponseData>>(
    "auth/login",
    data,
  );
};

export const sendOtp = (data: ForgotPasswordRequest) => {
  return axiosRequest.post<ApiResponseEnvelope<ForgotPasswordResponseData>>(
    "auth/forgot-password",
    data,
  );
};

export const verifyOtp = async (data: VerifyForgotPasswordOtpRequest) => {
  return axiosRequest.post<
    ApiResponseEnvelope<VerifyForgotPasswordOtpResponseData>
  >("/auth/forgot-password/verify", data);
};

export const resendForgotPasswordOtp = async (
  data: ResendForgotPasswordOtpRequest,
) => {
  return axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/auth/forgot-password/resend",
    data,
  );
};

export const resetPassword = (data: ResetPasswordRequest) => {
  return axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/auth/reset-password",
    data,
  );
};

export const logOut = () => {
  return axiosRequest.post<ApiResponseEnvelope<unknown>>("/auth/logout");
};

export const getMe = async () => {
  return await axiosRequest.get<ApiResponseEnvelope<UserInfoResponseData>>(
    "/auth/userinfo",
  );
};

export const updateInfo = (data: UpdateInforRequest) => {
  return axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/auth/update-info",
    data,
  );
};

export const changePassword = (data: ChangePasswordRequest) => {
  return axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/auth/change-password",
    data,
  );
};
