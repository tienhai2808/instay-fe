export interface ApiResponseEnvelope<T = unknown> {
  code: string;
  message: string;
  data: T;
}
