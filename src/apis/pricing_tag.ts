import axiosRequest from "@/config/axios";
import { ApiResponseEnvelope } from "@/types/response/common";
import {
  CreatePricingTagRequest,
  GetPricingTagsRequest,
  UpdatePricingTagRequest,
} from "@/types/request/pricing_tag";
import {
  PricingTagResponseData,
  PricingTagsResponseData,
} from "@/types/response/pricing_tag";

export const getPricingTags = async (params?: GetPricingTagsRequest) => {
  const query = new URLSearchParams();
  const view = params?.view?.trim();
  const search = params?.search?.trim();

  if (view) query.set("view", view);
  if (search) query.set("search", search);

  const queryString = query.toString();
  const url = queryString ? `/pricing-tags?${queryString}` : "/pricing-tags";

  return await axiosRequest.get<ApiResponseEnvelope<PricingTagsResponseData>>(
    url,
  );
};

export const createPricingTag = async (data: CreatePricingTagRequest) => {
  return await axiosRequest.post<ApiResponseEnvelope<PricingTagResponseData>>(
    "/pricing-tags",
    data,
  );
};

export const updatePricingTag = async (
  id: number,
  data: UpdatePricingTagRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    `/pricing-tags/${id}`,
    data,
  );
};

export const deletePricingTag = async (id: number) => {
  return await axiosRequest.delete<ApiResponseEnvelope<unknown>>(
    `/pricing-tags/${id}`,
  );
};
