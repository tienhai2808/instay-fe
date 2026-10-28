export type SseConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "stopped";

export interface SseEventPayload {
  event: string;
  data: unknown;
  rawData: string;
}
