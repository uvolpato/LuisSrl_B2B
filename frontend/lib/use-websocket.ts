import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// WebSocket via proxy Next.js (stessa origine): niente mixed content.
const WS_PATH = "/ws";

export interface WsMessage {
  type: string;
  payload: unknown;
}

type Listener = (msg: WsMessage) => void;

let globalSocket: Socket | null = null;
const listeners = new Set<Listener>();

function connect(): Socket {
  if (globalSocket?.connected) return globalSocket;
  globalSocket = io({
    path: WS_PATH,
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
  });
  globalSocket.on("connect", () => {
    for (const fn of listeners) fn({ type: "ws.connected", payload: {} });
  });
  globalSocket.on("disconnect", () => {
    for (const fn of listeners) fn({ type: "ws.disconnected", payload: {} });
  });
  globalSocket.on("connect_error", () => {
    for (const fn of listeners) fn({ type: "ws.disconnected", payload: {} });
  });
  globalSocket.onAny((event: string, ...args: unknown[]) => {
    for (const fn of listeners) fn({ type: event, payload: args[0] });
  });
  return globalSocket;
}

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const listenerRef = useRef<Listener>(undefined);

  useEffect(() => {
    const socket = connect();
    setConnected(socket.connected);

    const fn: Listener = (msg) => {
      if (msg.type === "ws.connected") setConnected(true);
      if (msg.type === "ws.disconnected") setConnected(false);
    };
    listenerRef.current = fn;
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const emit = useCallback((type: string, payload?: unknown) => {
    globalSocket?.emit(type, payload);
  }, []);

  return { connected, emit };
}

/** Sottoscrive un evento WS. Restituisce unsubscribe. */
export function useWsEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const fn: Listener = (msg) => {
      if (msg.type === event) handlerRef.current(msg.payload as T);
    };
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, [event]);
}
