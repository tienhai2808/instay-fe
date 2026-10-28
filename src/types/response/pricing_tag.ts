import type { PricingTag } from "@/types/data/pricing_tag";

export type PricingTagResponse = PricingTag;

export interface PricingTagsResponseData {
  pricing_tags?: PricingTagResponse[];
}

export interface PricingTagResponseData {
  pricing_tag?: PricingTagResponse;
}
