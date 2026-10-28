import axiosRequest from "@/config/axios";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CreateFloorRequest,
  GetFloorsRequest,
  UpdateFloorRequest,
} from "@/types/request/floor";
import { FloorResponseData, FloorsResponseData } from "@/types/response/floor";

export const getFloors = async (params?: GetFloorsRequest) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();
  const branchId = params?.branch_id?.trim();

  if (view) query.set("view", view);
  if (search) query.set("search", search);
  if (branchId) query.set("branch_id", branchId);

  const queryString = query.toString();
  const url = queryString ? `/floors?${queryString}` : "/floors";

  return await axiosRequest.get<ApiResponseEnvelope<FloorsResponseData>>(url);
};

export const createFloor = async (data: CreateFloorRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<FloorResponseData>>(
    "/floors",
    data,
  );
};

export const updateFloor = async (id: string, data: UpdateFloorRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/floors/${id}`,
    data,
  );
};

export const deleteFloor = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/floors/${id}`,
  );
};
