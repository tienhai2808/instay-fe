import { PaginationMeta } from "./meta";
import type { SimpleBookingRoomResponse } from "@/types/data/booking";

export type ChatAttachmentType = "image" | "file" | string;
export type ChatSenderType = "guest" | "staff" | "system" | string;
export type MessageReactionEmojiType =
  | "heart"
  | "like"
  | "sad"
  | "fun"
  | "angry"
  | string;

export interface BasicChatDepartmentResponse {
  id: string;
  name?: string;
}

export interface BasicChatResponse {
  id: string;
  department?: BasicChatDepartmentResponse | null;
  last_message_at?: string | null;
  last_message_content?: string | null;
  last_message_attachment_type?: ChatAttachmentType | null;
  last_message_sender_type?: ChatSenderType | null;
  last_message_sender_name?: string | null;
  unread_count?: number | null;
  has_unread?: boolean | null;
  expired_at?: string;
  created_at?: string;
}

export interface BasicAdminChatResponse {
  id: string;
  booking_room?: SimpleBookingRoomResponse | null;
  last_message_at?: string | null;
  last_message_content?: string | null;
  last_message_attachment_type?: ChatAttachmentType | null;
  last_message_sender_type?: ChatSenderType | null;
  last_message_sender_name?: string | null;
  unread_count?: number | null;
  has_unread?: boolean | null;
  expired_at?: string;
  created_at?: string;
}

export interface GuestChatsResponseData {
  chats?: BasicChatResponse[];
  meta?: PaginationMeta;
}

export interface AdminChatsResponseData {
  chats?: BasicAdminChatResponse[];
  meta?: PaginationMeta;
}

export interface GuestChatAvailabilityResponseData {
  department_id?: string | null;
  chat_id?: string | null;
  available?: boolean;
}

export interface AdminChatAvailabilityResponseData {
  chat_id?: string | null;
  available?: boolean;
}

export interface MessageUserResponse {
  sender_type?: ChatSenderType;
  sender_id?: string;
  sender_name?: string;
  read_at?: string | null;
}

export interface MessageReplyResponse {
  message_id?: string;
  sender_name?: string;
  content?: string | null;
  attachment_type?: ChatAttachmentType | null;
}

export interface MessageReactionResponse {
  sender_type?: ChatSenderType;
  sender_id?: string;
  sender_name?: string;
  emoji?: MessageReactionEmojiType;
  created_at?: string;
}

export interface ChatMessageResponse {
  id: string;
  chat_id?: string;
  sender_type?: ChatSenderType;
  sender_id?: string;
  sender_name?: string;
  attachment_key?: string | null;
  attachment_type?: ChatAttachmentType | null;
  content?: string | null;
  booking_room_read_at?: string | null;
  message_users?: MessageUserResponse[] | null;
  is_deleted?: boolean;
  message_reaction?: MessageReactionResponse[] | null;
  created_at?: string;
  message_reply?: MessageReplyResponse | null;
}

export interface GuestChatMessagesResponseData {
  messages?: ChatMessageResponse[];
  meta?: PaginationMeta;
  chat?: BasicChatResponse | null;
}

export interface AdminChatMessagesResponseData {
  messages?: ChatMessageResponse[];
  meta?: PaginationMeta;
  chat?: BasicAdminChatResponse | null;
}
