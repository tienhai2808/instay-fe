import Cookies from "js-cookie";
import { ACCESS_TOKEN, GUEST_TOKEN, REFRESH_TOKEN } from "@/constants/token";

export const getAccessToken = () => {
  return Cookies.get(ACCESS_TOKEN);
};

export const getRefreshToken = () => {
  return Cookies.get(REFRESH_TOKEN);
};

export const getGuestToken = () => {
  return Cookies.get(GUEST_TOKEN);
};

export const setAccessToken = (token: string) => {
  Cookies.set(ACCESS_TOKEN, token);
};

export const setRefreshToken = (token: string) => {
  Cookies.set(REFRESH_TOKEN, token);
};

export const removeTokens = () => {
  Cookies.remove(ACCESS_TOKEN);
  Cookies.remove(REFRESH_TOKEN);
};

export const removeGuestToken = () => {
  Cookies.remove(GUEST_TOKEN);
};
