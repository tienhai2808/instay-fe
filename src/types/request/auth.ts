export interface LoginRequest {
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyForgotPasswordOtpRequest {
  forgot_password_token: string;
  otp: string;
}

export interface ResendForgotPasswordOtpRequest {
  forgot_password_token: string;
}

export interface ResetPasswordRequest {
  new_password: string;
  reset_password_token: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateInforRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  avatar?: string | null;
}
