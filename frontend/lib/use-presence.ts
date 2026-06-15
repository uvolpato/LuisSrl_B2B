import { useState, useCallback } from "react";
import { useWebSocket, useWsEvent } from "./use-websocket";

interface OnlineEvent {
  userId: number;
  email?: string;
  nome?: string;
}

export function usePresence() {
  const { connected } = useWebSocket();
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useWsEvent<{ onlineIds: number[] }>("presence", useCallback((msg) => {
    setOnlineIds(new Set(msg.onlineIds));
  }, []));

  useWsEvent<OnlineEvent>("user.online", useCallback((msg) => {
    setOnlineIds((prev) => new Set(prev).add(msg.userId));
  }, []));

  useWsEvent<{ userId: number }>("user.offline", useCallback((msg) => {
    setOnlineIds((prev) => {
      const next = new Set(prev);
      next.delete(msg.userId);
      return next;
    });
  }, []));

  const isOnline = useCallback(
    (userId: number) => connected && onlineIds.has(userId),
    [connected, onlineIds],
  );

  return { connected, onlineIds, isOnline };
}
