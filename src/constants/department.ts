export const CUSTOMER_SERVICE_DEPARTMENT_NAME =
  "Chăm sóc khách hàng (Customer service)";

export const isCustomerServiceDepartmentName = (name?: string | null) =>
  (name || "").trim() === CUSTOMER_SERVICE_DEPARTMENT_NAME;
