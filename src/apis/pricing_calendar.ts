import axiosRequest from "@/config/axios";
import type { GetPricingCalendarsRequest } from "@/types/request/pricing_calendar";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type { PricingCalendarsResponseData } from "@/types/response/pricing_calendar";
import type { UpdatePricingCalendarsRequest } from "@/types/request/pricing_calendar";

export const getPricingCalendars = async (
  params?: GetPricingCalendarsRequest,
) => {
  const query = new URLSearchParams();

  if (params?.from_date) query.set("from_date", params.from_date);
  if (params?.to_date) query.set("to_date", params.to_date);

  const queryString = query.toString();
  const url = queryString
    ? `/pricing-calendars?${queryString}`
    : "/pricing-calendars";

  return await axiosRequest.get<
    ApiResponseEnvelope<PricingCalendarsResponseData>
  >(url);
};

export const updatePricingCalendars = async (
  data: UpdatePricingCalendarsRequest,
) => {
  return await axiosRequest.put<ApiResponseEnvelope<unknown>>(
    "/pricing-calendars",
    data,
  );
};
