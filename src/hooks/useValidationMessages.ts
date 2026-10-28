"use client";

import { useTranslations } from "next-intl";

export const useValidationMessages = () => {
  const t = useTranslations("Validation");

  const field = (key: string) => t(`fields.${key}`);

  return {
    field,
    required: (fieldLabel: string) => t("required", { field: fieldLabel }),
    invalidEmail: () => t("invalidEmail"),
    invalidPhone: () => t("invalidPhone"),
    minChars: (fieldLabel: string, min: number) =>
      t("minChars", { field: fieldLabel, min }),
    exactChars: (fieldLabel: string, length: number) =>
      t("exactChars", { field: fieldLabel, length }),
    greaterThanZero: (fieldLabel: string) =>
      t("greaterThanZero", { field: fieldLabel }),
    passwordMismatch: () => t("passwordMismatch"),
  };
};
