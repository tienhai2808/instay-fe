"use client";

import axiosRequest from "@/config/axios";
import { getWebSocketEndpoint } from "@/config/websocket";
import {
  WEBSOCKET_RETRY_BASE_MS,
  WEBSOCKET_RETRY_JITTER_RATIO,
  WEBSOCKET_RETRY_MAX_MS,
} from "@/constants/websocket";
import type {
  WebSocketConnectionStatus,
  WebSocketEventPayload,
} from "@/types/data/websocket";
import { getApiCode } from "@/utils/api-response";

interface SubscribeWebSocketOptions {
  onStatusChange?: (status: WebSocketConnectionStatus) => void;
  onEvent?: (payload: WebSocketEventPayload) => void;
}

interface RuntimeState {
  status: WebSocketConnectionStatus;
  subscribers: Map<number, SubscribeWebSocketOptions>;
  running: boolean;
  reconnectAttempt: number;
  activeSocket: WebSocket | null;
  loopPromise: Promise<void> | null;
}

const runtime: RuntimeState = {
  status: "idle",
  subscribers: new Map<number, SubscribeWebSocketOptions>(),
  running: false,
  reconnectAttempt: 0,
  activeSocket: null,
  loopPromise: null,
};

let nextSubscriberId = 1;
let refreshSessionPromise: Promise<RefreshSessionResult> | null = null;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const emitStatus = (nextStatus: WebSocketConnectionStatus) => {
  if (runtime.status === nextStatus) return;
  runtime.status = nextStatus;

  for (const subscriber of runtime.subscribers.values()) {
    subscriber.onStatusChange?.(nextStatus);
  }
};

const emitEvent = (payload: WebSocketEventPayload) => {
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
    WEBSOCKET_RETRY_BASE_MS * 2 ** attempt,
    WEBSOCKET_RETRY_MAX_MS,
  );
  const jitter = exponential * WEBSOCKET_RETRY_JITTER_RATIO * Math.random();

  return Math.round(exponential + jitter);
};

type RefreshSessionResult = "success" | "forbidden" | "failed";

interface ConnectOnceResult {
  opened: boolean;
  closedCode?: number;
}

const tryRefreshSession = async (): Promise<RefreshSessionResult> => {
  if (refreshSessionPromise) return refreshSessionPromise;

  refreshSessionPromise = (async () => {
    try {
      const response = await axiosRequest.post(
        "/auth/refresh-token",
        {},
        {
          withCredentials: true,
        },
      );

      if (response.status === 200 && getApiCode(response.data) === 1000) {
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
    } finally {
      refreshSessionPromise = null;
    }
  })();

  return refreshSessionPromise;
};

const resolveEventEnvelope = (parsed: unknown) => {
  const record = toRecord(parsed);

  if (!record) {
    return {
      event: "message",
      data: parsed,
    };
  }

  const eventNameRaw =
    typeof record.event === "string"
      ? record.event
      : typeof record.type === "string"
        ? record.type
        : "message";

  const eventName = eventNameRaw.trim() || "message";

  if ("data" in record) {
    return {
      event: eventName,
      data: record.data,
    };
  }

  if ("payload" in record) {
    return {
      event: eventName,
      data: record.payload,
    };
  }

  return {
    event: eventName,
    data: parsed,
  };
};

const readMessageDataAsText = async (value: unknown): Promise<string> => {
  if (typeof value === "string") return value;

  if (value instanceof Blob) {
    return await value.text();
  }

  if (value instanceof ArrayBuffer) {
    return new TextDecoder().decode(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new TextDecoder().decode(value);
  }

  if (value == null) return "";
  return String(value);
};

const emitMessageEvent = async (data: unknown) => {
  const rawData = await readMessageDataAsText(data);

  let parsedData: unknown = rawData;
  try {
    parsedData = JSON.parse(rawData);
  } catch {
    parsedData = rawData;
  }

  const envelope = resolveEventEnvelope(parsedData);

  emitEvent({
    event: envelope.event,
    data: envelope.data,
    rawData,
  });
};

const connectOnce = async (endpoint: string): Promise<ConnectOnceResult> => {
  return await new Promise<ConnectOnceResult>((resolve) => {
    let settled = false;
    let opened = false;
    const socket = new WebSocket(endpoint);
    runtime.activeSocket = socket;

    const finish = (result: ConnectOnceResult) => {
      if (settled) return;
      settled = true;

      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("error", handleError);

      if (runtime.activeSocket === socket) {
        runtime.activeSocket = null;
      }

      resolve(result);
    };

    const handleOpen = () => {
      opened = true;
      runtime.reconnectAttempt = 0;
      emitStatus("connected");
    };

    const handleMessage = (event: MessageEvent) => {
      void emitMessageEvent(event.data);
    };

    const handleClose = (event: CloseEvent) => {
      finish({
        opened,
        closedCode: event.code,
      });
    };

    const handleError = () => {
      // Browsers do not provide rich error details.
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("error", handleError);

    if (!runtime.running) {
      try {
        socket.close(1000, "client_stop");
      } catch {
        // Ignore close errors while stopping.
      }
      finish({ opened: false });
    }
  });
};

const waitForConnectionReady = async (timeoutMs: number) => {
  const deadline = Date.now() + Math.max(0, timeoutMs);

  while (Date.now() < deadline) {
    const socket = runtime.activeSocket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      return true;
    }

    if (!runtime.running && runtime.subscribers.size > 0) {
      startRuntime();
    }

    await wait(80);
  }

  return false;
};

const isLikelyAuthCloseCode = (code?: number) => {
  if (!code) return false;
  return [1008, 4001, 4003, 4401, 4403].includes(code);
};

const runConnectionLoop = async () => {
  while (runtime.running && runtime.subscribers.size > 0) {
    const endpoint = getWebSocketEndpoint();
    if (!endpoint) {
      runtime.running = false;
      break;
    }

    emitStatus(runtime.reconnectAttempt > 0 ? "reconnecting" : "connecting");

    const connectResult = await connectOnce(endpoint);

    if (!runtime.running || runtime.subscribers.size === 0) {
      break;
    }

    const shouldTryRefresh =
      !connectResult.opened || isLikelyAuthCloseCode(connectResult.closedCode);

    if (shouldTryRefresh) {
      const refreshResult = await tryRefreshSession();

      if (refreshResult === "success") {
        runtime.reconnectAttempt = 0;
        continue;
      }

      if (refreshResult === "forbidden") {
        runtime.running = false;
        break;
      }
    }

    runtime.reconnectAttempt += 1;
    emitStatus("reconnecting");
    await wait(computeRetryDelay());
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

export const stopWebSocketConnection = () => {
  runtime.running = false;
  runtime.reconnectAttempt = 0;

  const socket = runtime.activeSocket;
  runtime.activeSocket = null;

  if (socket) {
    try {
      socket.close(1000, "client_stop");
    } catch {
      // Ignore close errors to preserve stop semantics.
    }
  }

  emitStatus("stopped");
};

export const sendWebSocketMessage = (payload: unknown) => {
  const socket = runtime.activeSocket;
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;

  try {
    const message =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    socket.send(message);
    return true;
  } catch {
    return false;
  }
};

export const sendWebSocketMessageWithRetry = async (
  payload: unknown,
  options: {
    timeoutMs?: number;
  } = {},
) => {
  if (sendWebSocketMessage(payload)) return true;

  const timeoutMs = options.timeoutMs ?? 8000;
  const isReady = await waitForConnectionReady(timeoutMs);
  if (!isReady) return false;

  return sendWebSocketMessage(payload);
};

export const subscribeWebSocket = (options: SubscribeWebSocketOptions = {}) => {
  const subscriberId = nextSubscriberId++;

  runtime.subscribers.set(subscriberId, options);
  options.onStatusChange?.(runtime.status);
  startRuntime();

  return () => {
    runtime.subscribers.delete(subscriberId);

    if (runtime.subscribers.size === 0) {
      stopWebSocketConnection();
    }
  };
};
