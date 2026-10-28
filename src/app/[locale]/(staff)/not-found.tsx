import { getTranslations } from "next-intl/server";
import { getRequestLocale } from "@/utils/server/request-locale";
import { getNotFoundDefaultHref } from "@/utils/server/not-found-navigation";

export default async function StaffNotFoundPage() {
  const locale = await getRequestLocale();
  const t = await getTranslations({ locale, namespace: "NotFoundPage.staff" });
  const defaultHref = await getNotFoundDefaultHref("/login");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#6b7280]">
          {t("code")}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[#111827]">{t("title")}</h1>
        <p className="mt-3 text-sm text-[#4b5563]">{t("description")}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={defaultHref}
            className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white"
          >
            {t("primaryAction")}
          </a>
        </div>
      </div>
    </div>
  );
}
