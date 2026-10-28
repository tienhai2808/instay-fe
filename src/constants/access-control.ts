export const ROLE_ADMIN = "admin";
export const ROLE_STAFF = "staff";

export const DEPARTMENT_PERMISSION = {
  BOOKING_MANAGEMENT: "booking:management",
  GUEST_MANAGEMENT: "guest:management",
  ORDER_SERVICE_MANAGEMENT: "order_service:management",
  SUPPORT_TICKET_MANAGEMENT: "support_ticket:management",
} as const;

export const AUTHZ_COOKIE_KEY = "instay_authz";

export const STAFF_ROUTE_PERMISSION_ORDER = [
  {
    routePrefix: "/bookings",
    permission: DEPARTMENT_PERMISSION.BOOKING_MANAGEMENT,
  },
  {
    routePrefix: "/price-calculator",
    permission: DEPARTMENT_PERMISSION.BOOKING_MANAGEMENT,
  },
  {
    routePrefix: "/order-services",
    permission: DEPARTMENT_PERMISSION.ORDER_SERVICE_MANAGEMENT,
  },
  {
    routePrefix: "/support-tickets",
    permission: DEPARTMENT_PERMISSION.SUPPORT_TICKET_MANAGEMENT,
  },
  {
    routePrefix: "/accommodation",
    permission: DEPARTMENT_PERMISSION.GUEST_MANAGEMENT,
  },
] as const;

export const AUTHENTICATED_ALWAYS_ALLOWED_ROUTE_PREFIXES = [
  "/profile",
  "/chats",
  "/reviews",
] as const;

export const PUBLIC_ROUTE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/new-password",
  "/register",
] as const;
