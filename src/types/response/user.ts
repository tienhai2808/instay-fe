import { User } from "@/types/data/user";
import { PaginationMeta } from "./meta";

export interface UsersResponseData {
  users?: User[];
  meta?: PaginationMeta;
  pagination?: PaginationMeta;
}

export interface CreateUserResponseData {
  id: string;
}

export interface UserDetailResponseData {
  user?: User;
}
