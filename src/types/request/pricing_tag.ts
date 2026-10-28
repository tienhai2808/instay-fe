export interface GetPricingTagsRequest {
  view?: string;
  search?: string;
}

export interface CreatePricingTagRequest {
  name: string;
}

export interface UpdatePricingTagRequest {
  name: string;
}
