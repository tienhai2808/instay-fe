import { cookies } from "next/headers";
import { NEXT_LOCALE_COOKIE, resolveLocale } from "@/constants/locale";

export const getRequestLocale = async () => {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(NEXT_LOCALE_COOKIE)?.value);
};
