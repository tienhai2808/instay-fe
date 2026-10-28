import type { Source } from "@/types/data/source";

export type SourceResponse = Source;

export interface SourcesResponseData {
  sources?: SourceResponse[];
}

export interface SourceResponseData {
  source?: SourceResponse;
}
