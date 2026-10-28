export interface PaginationMeta {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  has_prev?: boolean;
  has_next?: boolean;
}
