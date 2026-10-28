export const STAFF_ROUTE_PREFIXES = [
  "/dashboard",
  "/bookings",
  "/price-calculator",
  "/calendar",
  "/room-types",
  "/rooms",
  "/service-types",
  "/services",
  "/events",
  "/order-services",
  "/support-categories",
  "/support-tickets",
  "/accommodation",
  "/customers",
  "/profile",
  "/departments",
  "/branches",
  "/staffs",
  "/settings",
  "/reviews",
  "/chats",
] as const;

export const GUEST_ROUTE_PREFIXES = [
  "/home",
  "/news",
  "/collections",
  "/products",
  "/feedbacks",
  "/requests",
  "/messages",
  "/orders",
] as const;

export const AUTH_ROUTE_PREFIXES = [
  "/login",
  "/forgot-password",
  "/new-password",
  "/register",
] as const;

export const ANONYMOUS_ROUTE_PREFIXES = ["/qr"] as const;

export const ANONYMOUS_DEFAULT_ROUTE = "/login";
export const GUEST_DEFAULT_ROUTE = "/home";
