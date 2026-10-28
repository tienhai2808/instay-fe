import axiosRequest from "@/config/axios";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type { NotificationPaginationQuery } from "@/types/request/notification";
import type {
  NotificationsResponseData,
  NotificationUnreadCountResponseData,
} from "@/types/response/notification";

const buildNotificationsUrl = (
  prefix: string,
  params?: NotificationPaginationQuery,
) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const queryString = query.toString();
  return queryString
    ? `${prefix}/notifications?${queryString}`
    : `${prefix}/notifications`;
};

export const getNotifications = async (
  params?: NotificationPaginationQuery,
) => {
  const url = buildNotificationsUrl("/admin", params);

  return await axiosRequest.get<ApiResponseEnvelope<NotificationsResponseData>>(
    url,
  );
};

export const getUnreadNotificationsCount = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<NotificationUnreadCountResponseData>
  >("/admin/notifications/count");
};

export const getGuestNotifications = async (
  params?: NotificationPaginationQuery,
) => {
  const url = buildNotificationsUrl("", params);

  return await axiosRequest.get<ApiResponseEnvelope<NotificationsResponseData>>(
    url,
  );
};

export const getGuestUnreadNotificationsCount = async () => {
  return await axiosRequest.get<
    ApiResponseEnvelope<NotificationUnreadCountResponseData>
  >("/notifications/count");
};
