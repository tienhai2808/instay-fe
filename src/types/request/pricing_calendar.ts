export interface GetPricingCalendarsRequest {
  from_date?: string;
  to_date?: string;
}

export interface UpdatePricingCalendarRequest {
  pricing_tag_id: string;
  dates: string[];
}

export interface UpdatePricingCalendarsRequest {
  pricing_calendars: UpdatePricingCalendarRequest[];
}
