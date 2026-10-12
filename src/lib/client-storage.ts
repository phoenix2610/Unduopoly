export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export interface SavedOrder {
  id: string;
  token: string;
  savedAt: string;
}

const ordersKey = (slug: string) => `undu:${slug}:orders`;

export function savedOrders(slug: string): SavedOrder[] {
  return readJson<SavedOrder[]>(ordersKey(slug), []);
}

export function saveOrder(slug: string, id: string, token: string) {
  const rest = savedOrders(slug).filter((o) => o.id !== id);
  writeJson(ordersKey(slug), [{ id, token, savedAt: new Date().toISOString() }, ...rest].slice(0, 10));
}
