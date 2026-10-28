import { Floor } from "@/types/data/floor";

export type FloorResponse = Floor;

export interface FloorsResponseData {
  floors?: FloorResponse[];
}

export interface FloorResponseData {
  floor?: FloorResponse;
}
