import { useEffect, useRef, useCallback } from 'react';
import type { WsEvent } from '../types';

interface UseWebSocketOptions {
  onMessage?: (event: WsEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  enabled?: boolean;
}

export const useWebSocket = ({ onMessage, onOpen, onClose, enabled = true }: UseWebSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const callbacksRef = useRef({ onMessage, onOpen, onClose });
  callbacksRef.current = { onMessage, onOpen, onClose };

  const connect = useCallback(() => {
    if (!enabled) return;

    // Prevent duplicate connection if already open or connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `ws://${window.location.hostname}:8000/ws/dashboard`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to GEOCAST dashboard stream');
      callbacksRef.current.onOpen?.();
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as WsEvent;
        callbacksRef.current.onMessage?.(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected — reconnecting in 3s...');
      callbacksRef.current.onClose?.();
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
};

