"use client";

import axiosRequest from "@/config/axios";
import { getSseEndpoint } from "@/config/sse";
import {
  SSE_RETRY_BASE_MS,
  SSE_RETRY_JITTER_RATIO,
  SSE_RETRY_MAX_MS,
} from "@/constants/sse";
import type { SseConnectionStatus, SseEventPayload } from "@/types/data/sse";
import { getApiCode } from "@/utils/api-response";
import { forceLogoutToLogin } from "@/utils/auth-session";

interface SubscribeSseOptions {
  onStatusChange?: (status: SseConnectionStatus) => void;
  onEvent?: (payload: SseEventPayload) => void;
}

interface RuntimeState {
  status: SseConnectionStatus;
  subscribers: Map<number, SubscribeSseOptions>;
  running: boolean;
  reconnectAttempt: number;
  activeController: AbortController | null;
  loopPromise: Promise<void> | null;
}

const runtime: RuntimeState = {
  status: "idle",
  subscribers: new Map<number, SubscribeSseOptions>(),
  running: false,
  reconnectAttempt: 0,
  activeController: null,
  loopPromise: null,
};

let nextSubscriberId = 1;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  return (
    "name" in error &&
    typeof (error as { name?: unknown }).name === "string" &&
    (error as { name?: string }).name === "AbortError"
  );
};

const emitStatus = (nextStatus: SseConnectionStatus) => {
  if (runtime.status === nextStatus) return;
  runtime.status = nextStatus;

  for (const subscriber of runtime.subscribers.values()) {
    subscriber.onStatusChange?.(nextStatus);
  }
};

const emitEvent = (payload: SseEventPayload) => {
  for (const subscriber of runtime.subscribers.values()) {
    try {
      subscriber.onEvent?.(payload);
    } catch {
      continue;
    }
  }
};

const computeRetryDelay = () => {
  const attempt = Math.max(runtime.reconnectAttempt - 1, 0);
  const exponential = Math.min(
    SSE_RETRY_BASE_MS * 2 ** attempt,
    SSE_RETRY_MAX_MS,
  );
  const jitter = exponential * SSE_RETRY_JITTER_RATIO * Math.random();

  return Math.round(exponential + jitter);
};

const isSuccessApiCode = (payload: unknown) => {
  return getApiCode(payload) === 1000;
};

type RefreshSessionResult = "success" | "forbidden" | "failed";

const tryRefreshSession = async (): Promise<RefreshSessionResult> => {
  try {
    const response = await axiosRequest.post(
      "/auth/refresh-token",
      {},
      {
        withCredentials: true,
      },
    );

    if (response.status === 200 && isSuccessApiCode(response.data)) {
      return "success";
    }

    return "failed";
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object" &&
      (error as { response?: { status?: unknown } }).response != null
        ? (error as { response?: { status?: unknown } }).response?.status
        : undefined;

    if (status === 403) {
      return "forbidden";
    }

    return "failed";
  }
};

const consumeStream = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let chunkBuffer = "";
  let currentEventName = "message";
  let currentDataLines: string[] = [];

  const dispatchEvent = () => {
    if (currentDataLines.length === 0) {
      currentEventName = "message";
      return;
    }

    const rawData = currentDataLines.join("\n");
    let parsedData: unknown = rawData;

    try {
      parsedData = JSON.parse(rawData);
    } catch {
      parsedData = rawData;
    }

    emitEvent({
      event: currentEventName,
      data: parsedData,
      rawData,
    });

    currentEventName = "message";
    currentDataLines = [];
  };

  const consumeLine = (line: string) => {
    if (line === "") {
      dispatchEvent();
      return;
    }

    if (line.startsWith(":")) {
      return;
    }

    if (line.startsWith("event:")) {
      const nextEvent = line.slice("event:".length).trim();
      currentEventName = nextEvent || "message";
      return;
    }

    if (line.startsWith("data:")) {
      currentDataLines.push(line.slice("data:".length).trimStart());
      return;
    }
  };

  while (runtime.running && runtime.subscribers.size > 0) {
    const { done, value } = await reader.read();

    if (done) {
      chunkBuffer += decoder.decode();
      break;
    }

    chunkBuffer += decoder.decode(value, { stream: true });
    const lines = chunkBuffer.split(/\r?\n/);
    chunkBuffer = lines.pop() ?? "";

    for (const line of lines) {
      consumeLine(line);
    }
  }

  if (chunkBuffer) {
    consumeLine(chunkBuffer);
  }
  dispatchEvent();

  if (runtime.running && runtime.subscribers.size > 0) {
    throw new Error("SSE_STREAM_CLOSED");
  }
};

const runConnectionLoop = async () => {
  while (runtime.running && runtime.subscribers.size > 0) {
    const endpoint = getSseEndpoint();
    if (!endpoint) {
      runtime.running = false;
      break;
    }

    emitStatus(runtime.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    const controller = new AbortController();
    runtime.activeController = controller;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.status === 401) {
        const refreshResult = await tryRefreshSession();

        if (refreshResult === "success") {
          runtime.reconnectAttempt = 0;
          continue;
        }

        if (refreshResult === "forbidden") {
          forceLogoutToLogin();
          runtime.running = false;
          break;
        }

        throw new Error("SSE_REFRESH_FAILED");
      }

      if (response.status === 403) {
        forceLogoutToLogin();
        runtime.running = false;
        break;
      }

      if (!response.ok || !response.body) {
        throw new Error(`SSE_BAD_RESPONSE_${response.status}`);
      }

      runtime.reconnectAttempt = 0;
      emitStatus("connected");
      await consumeStream(response.body);
    } catch (error) {
      if (isAbortError(error)) {
        break;
      }

      if (!runtime.running || runtime.subscribers.size === 0) {
        break;
      }

      runtime.reconnectAttempt += 1;
      emitStatus("reconnecting");
      await wait(computeRetryDelay());
    } finally {
      if (runtime.activeController === controller) {
        runtime.activeController = null;
      }
    }
  }

  emitStatus("stopped");
};

const startRuntime = () => {
  if (runtime.running) return;
  if (runtime.subscribers.size === 0) return;

  runtime.running = true;
  runtime.reconnectAttempt = 0;
  runtime.loopPromise = runConnectionLoop().finally(() => {
    runtime.loopPromise = null;
  });
};

export const stopSseConnection = () => {
  runtime.running = false;
  runtime.reconnectAttempt = 0;
  runtime.activeController?.abort();
  runtime.activeController = null;
  emitStatus("stopped");
};

export const subscribeSse = (options: SubscribeSseOptions = {}) => {
  const subscriberId = nextSubscriberId++;

  runtime.subscribers.set(subscriberId, options);
  options.onStatusChange?.(runtime.status);
  startRuntime();

  return () => {
    runtime.subscribers.delete(subscriberId);

    if (runtime.subscribers.size === 0) {
      stopSseConnection();
    }
  };
};
