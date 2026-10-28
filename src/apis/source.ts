import axiosRequest from "@/config/axios";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CreateSourceRequest,
  GetSourcesRequest,
  UpdateSourceRequest,
} from "@/types/request/source";
import {
  SourceResponseData,
  SourcesResponseData,
} from "@/types/response/source";

export const getSources = async (params?: GetSourcesRequest) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();

  if (view) query.set("view", view);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/sources?${queryString}` : "/sources";

  return await axiosRequest.get<ApiResponseEnvelope<SourcesResponseData>>(url);
};

export const createSource = async (data: CreateSourceRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<SourceResponseData>>(
    "/sources",
    data,
  );
};

export const updateSource = async (id: string, data: UpdateSourceRequest) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/sources/${id}`,
    data,
  );
};

export const deleteSource = async (id: string) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/sources/${id}`,
  );
};
