import axiosRequest from "@/config/axios";
import type {
  CreateBranchRequest,
  GetBranchesRequest,
  UpdateBranchRequest,
} from "@/types/request/branch";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  BasicBranchesResponseData,
  BranchesResponseData,
} from "@/types/response/branch";

export const getBranches = async (params?: GetBranchesRequest) => {
  const query = new URLSearchParams();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const search = params?.search?.trim();
  const city = params?.city?.trim();

  if (search) query.set("search", search);
  if (city) query.set("city", city);
  if (typeof params?.is_active === "boolean") {
    query.set("is_active", String(params.is_active));
  }
  if (params?.view) query.set("view", params.view);

  const queryString = query.toString();
  const url = queryString ? `/branches?${queryString}` : "/branches";

  return await axiosRequest.get<ApiResponseEnvelope<BranchesResponseData>>(url);
};

export const getBasicBranches = async () => {
  return await axiosRequest.get<ApiResponseEnvelope<BasicBranchesResponseData>>(
    "/branches?view=basic",
  );
};

export const createBranch = async (data: CreateBranchRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<unknown>>(
    "/branches",
    data,
  );
};

export const updateBranch = async (
  branchId: string,
  data: UpdateBranchRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/branches/${branchId}`,
    data,
  );
};

export const deleteBranch = async (branchId: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/branches/${branchId}`,
  );
};
