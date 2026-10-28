export const PATH = {
  DEFAULT: "#",
  HOME: "/dashboard",
  PAYMENT: "/payment",
  DASHBOARD: "/dashboard",
  LOGIN: "/login",
  FORGET_PASSWORD: "/forget-password",
  RESET_PASSWORD: "/reset-password",
  REGISTER: "/register",
};

export const AUTH_PATHS = [PATH.LOGIN, PATH.REGISTER] as const;
