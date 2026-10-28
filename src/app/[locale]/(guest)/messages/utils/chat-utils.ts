import type { Department } from "@/types/data/department";
import type { DepartmentResponseData } from "@/types/response/department";
import { CUSTOMER_SERVICE_DEPARTMENT_NAME } from "@/constants/department";

export const DEFAULT_CUSTOMER_SERVICE_DEPARTMENT_NAME =
  CUSTOMER_SERVICE_DEPARTMENT_NAME;
export const DEFAULT_DEPARTMENT_AVATAR_LABEL = "CS";

export const resolveDepartmentFromResponse = (
  raw?: DepartmentResponseData | Department | null,
) => {
  if (!raw) return null;

  if (
    typeof raw === "object" &&
    raw !== null &&
    "department" in raw &&
    typeof raw.department === "object" &&
    raw.department !== null
  ) {
    return raw.department as Department;
  }

  return raw as Department;
};

export const resolveDepartmentInitials = (departmentName?: string | null) => {
  const words = (departmentName || "").trim().split(/\s+/).filter(Boolean);

  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return initials || DEFAULT_DEPARTMENT_AVATAR_LABEL;
};
