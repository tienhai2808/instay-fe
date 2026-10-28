import Cookies from "js-cookie";

export function getCookie(key: string) {
  return Cookies.get(key);
}

export function setCookie(
  key: string,
  value: string,
  options?: Cookies.CookieAttributes
) {
  return Cookies.set(key, value, options);
}

export function removeCookie(key: string) {
  return Cookies.remove(key);
}