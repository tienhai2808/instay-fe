import { User } from "@/types/data/user";

export interface LoginResponseData {
  user?: User;
}

export interface UserInfoResponseData {
  user: User;
}

export interface ForgotPasswordResponseData {
  forgot_password_token: string;
}

export interface VerifyForgotPasswordOtpResponseData {
  reset_password_token: string;
}
