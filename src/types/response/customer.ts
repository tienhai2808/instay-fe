import type { Customer } from "@/types/data/customer";
import type { PaginationMeta } from "./meta";

export interface CustomersResponseData {
  customers?: Customer[];
  data?: Customer[];
  pagination?: PaginationMeta;
  meta?: PaginationMeta;
}
