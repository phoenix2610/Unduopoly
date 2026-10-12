"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { readJson, writeJson } from "@/lib/client-storage";
import type { MenuItem, OrderKind, Restaurant } from "@/lib/types";

interface Cart {
  kind: OrderKind;
  qty: Record<string, number>;
  partySize: number;
}

interface StoreContext {
  restaurant: Restaurant;
  base: string;
  cart: Cart;
  hydrated: boolean;
  lines: Array<{ item: MenuItem; qty: number }>;
  itemCount: number;
  subtotalPaise: number;
  setQty: (itemId: string, qty: number) => void;
  setKind: (kind: OrderKind) => void;
  setPartySize: (n: number) => void;
  clear: () => void;
}

const Ctx = createContext<StoreContext | null>(null);

const emptyCart: Cart = { kind: "pickup", qty: {}, partySize: 2 };

export function StoreProvider({
  restaurant,
  base,
  children,
}: {
  restaurant: Restaurant;
  base: string;
  children: React.ReactNode;
}) {
  const key = `undu:${restaurant.slug}:cart`;
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readJson<Cart>(key, emptyCart);
    const mode = new URLSearchParams(window.location.search).get("mode");
    const hasFood = Object.keys(saved.qty ?? {}).length > 0;
    const kind: OrderKind =
      mode === "table" ? (hasFood ? "dine_in" : "booking") : mode === "pickup" ? "pickup" : saved.kind;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart({ ...emptyCart, ...saved, kind });
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (hydrated) writeJson(key, cart);
  }, [cart, hydrated, key]);

  const setQty = useCallback((itemId: string, qty: number) => {
    setCart((c) => {
      const next = { ...c.qty };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = Math.min(qty, 30);
      const kind = c.kind === "booking" && qty > 0 ? "dine_in" : c.kind;
      return { ...c, kind, qty: next };
    });
  }, []);

  const value = useMemo<StoreContext>(() => {
    const lines = restaurant.items
      .filter((item) => (cart.qty[item.id] ?? 0) > 0)
      .map((item) => ({ item, qty: cart.qty[item.id] }));
    return {
      restaurant,
      base,
      cart,
      hydrated,
      lines,
      itemCount: lines.reduce((n, l) => n + l.qty, 0),
      subtotalPaise: lines.reduce((n, l) => n + l.item.pricePaise * l.qty, 0),
      setQty,
      setKind: (kind) => setCart((c) => ({ ...c, kind })),
      setPartySize: (n) => setCart((c) => ({ ...c, partySize: Math.min(12, Math.max(1, n)) })),
      clear: () => setCart((c) => ({ ...c, qty: {} })),
    };
  }, [restaurant, base, cart, hydrated, setQty]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore outside StoreProvider");
  return ctx;
}
