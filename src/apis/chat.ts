import axiosRequest from "@/config/axios";
import type {
  GetAdminChatAvailabilityRequest,
  GetGuestChatAvailabilityRequest,
  GetGuestChatMessagesRequest,
  GetGuestChatsRequest,
} from "@/types/request/chat";
import type { ApiResponseEnvelope } from "@/types/response/common";
import type {
  AdminChatAvailabilityResponseData,
  AdminChatMessagesResponseData,
  AdminChatsResponseData,
  GuestChatAvailabilityResponseData,
  GuestChatMessagesResponseData,
  GuestChatsResponseData,
} from "@/types/response/chat";

const buildChatsUrl = (params?: GetGuestChatsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (search) query.set("search", search);

  const queryString = query.toString();
  return queryString ? `/chats?${queryString}` : "/chats";
};

export const getGuestChats = async (params?: GetGuestChatsRequest) => {
  const url = buildChatsUrl(params);
  return await axiosRequest.get<ApiResponseEnvelope<GuestChatsResponseData>>(
    url,
  );
};

const buildChatAvailabilityUrl = (params: GetGuestChatAvailabilityRequest) => {
  const query = new URLSearchParams();
  const supportCategoryId = params.support_category_id?.trim();
  const serviceId = params.service_id?.trim();

  if (supportCategoryId) {
    query.set("support_category_id", supportCategoryId);
  }
  if (serviceId) {
    query.set("service_id", serviceId);
  }

  const queryString = query.toString();
  return queryString
    ? `/chats/availability?${queryString}`
    : "/chats/availability";
};

export const getGuestChatAvailability = async (
  params: GetGuestChatAvailabilityRequest,
) => {
  const url = buildChatAvailabilityUrl(params);
  return await axiosRequest.get<
    ApiResponseEnvelope<GuestChatAvailabilityResponseData>
  >(url);
};

const buildAdminChatAvailabilityUrl = (
  params: GetAdminChatAvailabilityRequest,
) => {
  const query = new URLSearchParams();
  const bookingRoomId = params.booking_room_id?.trim();

  if (bookingRoomId) {
    query.set("booking_room_id", bookingRoomId);
  }

  const queryString = query.toString();
  const basePath = "/admin/chats/availability";
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export const getAdminChatAvailability = async (
  params: GetAdminChatAvailabilityRequest,
) => {
  const url = buildAdminChatAvailabilityUrl(params);
  return await axiosRequest.get<
    ApiResponseEnvelope<AdminChatAvailabilityResponseData>
  >(url);
};

const buildAdminChatsUrl = (params?: GetGuestChatsRequest) => {
  const query = new URLSearchParams();
  const search = params?.search?.trim();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (search) query.set("search", search);

  const queryString = query.toString();
  return queryString ? `/admin/chats?${queryString}` : "/admin/chats";
};

export const getAdminChats = async (params?: GetGuestChatsRequest) => {
  const url = buildAdminChatsUrl(params);
  return await axiosRequest.get<ApiResponseEnvelope<AdminChatsResponseData>>(
    url,
  );
};

const buildChatMessagesUrl = (
  chatId: string,
  params?: GetGuestChatMessagesRequest,
) => {
  const normalizedChatId = chatId.trim();
  const query = new URLSearchParams();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.includeChat) query.set("include", "chat");

  const queryString = query.toString();
  const basePath = `/chats/${encodeURIComponent(normalizedChatId)}/messages`;
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export const getGuestChatMessages = async (
  chatId: string,
  params?: GetGuestChatMessagesRequest,
) => {
  const url = buildChatMessagesUrl(chatId, params);
  return await axiosRequest.get<
    ApiResponseEnvelope<GuestChatMessagesResponseData>
  >(url);
};

const buildAdminChatMessagesUrl = (
  chatId: string,
  params?: GetGuestChatMessagesRequest,
) => {
  const normalizedChatId = chatId.trim();
  const query = new URLSearchParams();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.includeChat) query.set("include", "chat");

  const queryString = query.toString();
  const basePath = `/admin/chats/${encodeURIComponent(normalizedChatId)}/messages`;
  return queryString ? `${basePath}?${queryString}` : basePath;
};

export const getAdminChatMessages = async (
  chatId: string,
  params?: GetGuestChatMessagesRequest,
) => {
  const url = buildAdminChatMessagesUrl(chatId, params);
  return await axiosRequest.get<
    ApiResponseEnvelope<AdminChatMessagesResponseData>
  >(url);
};
