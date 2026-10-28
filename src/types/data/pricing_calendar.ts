import type { PricingTag } from "./pricing_tag";

export interface PricingCalendar {
  date: string;
  pricing_tag_id?: number | null;
  pricing_tag?: PricingTag | null;
}
