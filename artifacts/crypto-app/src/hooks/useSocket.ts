import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { PriceTick, Candle, Trade } from "@workspace/api-client-react";

type SocketEvents = {
  price_update: (data: PriceTick) => void;
  candle_update: (data: { symbol: string; candle: Candle }) => void;
  trade_settled: (data: { tradeId: string; result: string; exitPrice: number; profitLoss: number }) => void;
};

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a token
    const token = localStorage.getItem("crypto_token");
    const url = new URL(window.location.href);
    const origin = url.origin;
    
    socketRef.current = io(origin, {
      path: "/socket.io",
      auth: { token },
      autoConnect: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const subscribe = useCallback(<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) => {
    if (!socketRef.current) return () => {};
    // @ts-ignore - generic typing for socket.on is complex
    socketRef.current.on(event, callback);
    return () => {
      if (socketRef.current) {
        // @ts-ignore
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    subscribe
  };
}
