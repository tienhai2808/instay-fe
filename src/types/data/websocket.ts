export type WebSocketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "stopped";

export interface WebSocketEventPayload {
  event: string;
  data: unknown;
  rawData: string;
}
