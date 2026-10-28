"use client";

import { useEffect } from "react";
import { subscribeWebSocket } from "@/services/websocket";

export default function WebSocketProvider() {
  useEffect(() => {
    return subscribeWebSocket();
  }, []);

  return null;
}
