import type { SupportCategory } from "@/types/data/support_category";
import type { PaginationMeta } from "./meta";

export interface SupportCategoriesResponseData {
  support_categories?: SupportCategory[];
  pagination?: PaginationMeta;
}

export interface SupportCategoryResponseData {
  support_category?: SupportCategory;
}
