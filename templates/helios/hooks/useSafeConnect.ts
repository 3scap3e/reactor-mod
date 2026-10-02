"use client";

import { useCallback, useState } from "react";
import { useHelios } from "@reactor-models/helios";
import { CONNECT_ATTEMPTS } from "../types/generation";

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function useSafeConnect() {
  const { connect, disconnect } = useHelios();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const safeConnect = useCallback(async () => {
    setConnectError(null);
    for (let i = 1; i <= CONNECT_ATTEMPTS; i++) {
      setAttempt(i);
      try {
        await connect();
        setAttempt(0);
        return true;
      } catch (e) {
        console.log("reactor connect failed", i, e);
        try {
          await disconnect();
        } catch (closeError) {
          console.log("reactor disconnect after failure failed", closeError);
        }
        if (i === CONNECT_ATTEMPTS) {
          setConnectError(
            `Could not connect (${describe(e)}). The session was closed so it is not billed. Try again, or try Chrome with VPN and WebRTC-blocking extensions off.`,
          );
        }
      }
    }
    setAttempt(0);
    return false;
  }, [connect, disconnect]);

  return { safeConnect, connectError, attempt };
}
