import type { OrderService } from "@/types/data/order_service";
import type { PaginationMeta } from "./meta";

export interface OrderServicesResponseData {
  order_services?: OrderService[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface OrderServiceResponseData {
  order_service?: OrderService;
}
