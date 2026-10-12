"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicOrder } from "@/lib/types";

export function useOrder(id: string, token: string | null, everyMs = 4000) {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${id}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.status === 404) setMissing(true);
      else if (res.ok) setOrder(await res.json());
    } catch {
    }
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const tick = () => document.visibilityState === "visible" && refresh();
    const timer = window.setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [token, refresh, everyMs]);

  return { order, missing, refresh, setOrder };
}
