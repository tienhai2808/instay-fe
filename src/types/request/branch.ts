export interface GetBranchesRequest {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  is_active?: boolean;
  view?: "basic";
}

export interface CreateBranchRequest {
  name: string;
  address: string;
  ward: string;
  city: string;
  is_active: boolean;
}

export type UpdateBranchRequest = CreateBranchRequest;
