import type { User } from "./user";
import type { BasicBranch } from "./branch";

export interface Event {
  id: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  thumbnail?: string | null;
  is_active: boolean;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: User | null;
  updated_by?: User | null;
  branches?: BasicBranch[];
}

export interface NewsSummary {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  thumbnail?: string | null;
  published_at?: string | null;
}

export interface NewsDetail {
  id: string;
  title: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string | null;
  published_at?: string | null;
}
