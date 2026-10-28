/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import qs from "qs";
import { AUTH_SILENT_ERROR_FLAG } from "@/constants/auth";
import { reportAxiosErrorToFaro } from "@/services/monitoring/faro";
import { forceLogoutToLogin } from "@/utils/auth-session";

type RetryConfig = {
  _retry?: boolean;
};

type RetriableAxiosRequestConfig = AxiosRequestConfig & RetryConfig;

let refreshPromise: Promise<void> | null = null;

const axiosRequest: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
  paramsSerializer: (params: any) =>
    qs.stringify(params, { arrayFormat: "indices", allowDots: true }),
});

const callRefreshToken = () => {
  return axiosRequest.post<unknown>(
    "/auth/refresh-token",
    {},
    {
      withCredentials: true,
    },
  );
};

const normalizeCode = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return undefined;
};

const extractResponseCode = (payload: unknown): number | undefined => {
  if (!payload || typeof payload !== "object") return undefined;

  const direct = normalizeCode((payload as { code?: unknown }).code);
  if (direct != null) return direct;

  const firstLevel = normalizeCode(
    (payload as { data?: { code?: unknown } }).data?.code,
  );
  if (firstLevel != null) return firstLevel;

  return undefined;
};

const markSilentAuthError = <T>(error: T): T => {
  if (error && typeof error === "object") {
    (error as Record<string, unknown>)[AUTH_SILENT_ERROR_FLAG] = true;
  }
  return error;
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = callRefreshToken()
    .then((response) => {
      if (response.status !== 200) {
        throw new AxiosError(
          undefined,
          AxiosError.ERR_BAD_RESPONSE,
          response.config,
          response.request,
          response,
        );
      }

      const code = extractResponseCode(response.data);
      if (code !== 1000) {
        throw new AxiosError(
          undefined,
          AxiosError.ERR_BAD_RESPONSE,
          response.config,
          response.request,
          response,
        );
      }
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

axiosRequest.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as RetriableAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const requestUrl = `${originalRequest.url ?? ""}`;
      const isRefreshRequest = requestUrl.includes("/auth/refresh-token");
      if (isRefreshRequest) {
        return Promise.reject(error);
      }

      try {
        await refreshAccessToken();
        return axiosRequest(originalRequest);
      } catch (refreshError) {
        const status = (refreshError as { response?: { status?: number } })
          ?.response?.status;

        if (status === 403) {
          forceLogoutToLogin();
          return Promise.reject(markSilentAuthError(refreshError));
        }

        return Promise.reject(refreshError);
      }
    }

    if (error.code === AxiosError.ERR_NETWORK) {
      reportAxiosErrorToFaro(error);
      return Promise.reject(error);
    }

    if ((error.response?.status ?? 0) >= 500) {
      reportAxiosErrorToFaro(error);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosRequest;

// Kept for backward compatibility: proactive refresh has been disabled.
export function bootstrapAuthTimer() {
  return;
}
