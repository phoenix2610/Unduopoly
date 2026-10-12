import "server-only";
import { demoRestaurant, demoReviews } from "./demo-data";
import { gatewayCharge } from "./money";
import { addMinutes, istDate, istNow } from "./time";
import type { Order, Restaurant, Review } from "./types";

interface Db {
  restaurants: Map<string, Restaurant>;
  orders: Map<string, Order>;
  reviews: Map<string, Review>;
  seq: number;
}

const g = globalThis as typeof globalThis & { __unduopolyDb?: Db };

function db(): Db {
  if (!g.__unduopolyDb) {
    const fresh: Db = {
      restaurants: new Map([[demoRestaurant.slug, demoRestaurant]]),
      orders: new Map(),
      reviews: new Map(),
      seq: 409,
    };
    g.__unduopolyDb = fresh;
    seedOrders(fresh);
    seedReviews(fresh);
  }
  return g.__unduopolyDb;
}

export async function getRestaurant(slug: string): Promise<Restaurant | null> {
  return db().restaurants.get(slug) ?? null;
}

export async function listOrders(slug: string): Promise<Order[]> {
  return [...db().orders.values()].filter((o) => o.slug === slug);
}

export async function getOrder(id: string): Promise<Order | null> {
  return db().orders.get(id) ?? null;
}

export async function insertOrder(order: Omit<Order, "id" | "code">): Promise<Order> {
  const store = db();
  store.seq += 1;
  const full: Order = { ...order, id: crypto.randomUUID(), code: `A-${String(store.seq).padStart(4, "0")}` };
  store.orders.set(full.id, full);
  return full;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<Order | null> {
  const store = db();
  const current = store.orders.get(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  store.orders.set(id, next);
  return next;
}

export async function listReviews(slug: string): Promise<Review[]> {
  return [...db().reviews.values()].filter((r) => r.slug === slug).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function insertReview(review: Omit<Review, "id">): Promise<Review> {
  const full: Review = { ...review, id: crypto.randomUUID() };
  db().reviews.set(full.id, full);
  return full;
}

function seedReviews(store: Db) {
  const now = new Date();
  for (const r of demoReviews) {
    const id = crypto.randomUUID();
    const { daysAgo, ...rest } = r;
    store.reviews.set(id, { ...rest, id, slug: demoRestaurant.slug, createdAt: addMinutes(now, -daysAgo * 24 * 60 - 180).toISOString() });
  }
}

function seedOrders(store: Db) {
  const r = demoRestaurant;
  const now = new Date();
  const ist = istNow(now);
  const slotAfter = (mins: number) => {
    const m = Math.ceil((ist.minutes + mins) / r.slotMinutes) * r.slotMinutes;
    return istDate(ist, m).toISOString();
  };
  const line = (id: string, qty: number) => {
    const item = r.items.find((i) => i.id === id)!;
    return { itemId: id, name: item.name, pricePaise: item.pricePaise, veg: item.veg, qty };
  };
  const seeds: Array<Pick<Order, "kind" | "customerName" | "phone" | "lines" | "status" | "slotStart"> & Partial<Order>> = [
    {
      kind: "pickup",
      customerName: "Harleen",
      phone: "9814012345",
      lines: [line("dal-makhani", 1), line("butter-naan", 4), line("lassi", 2)],
      status: "ready",
      slotStart: slotAfter(-5),
      acceptedAt: addMinutes(now, -25).toISOString(),
      readyAt: addMinutes(now, -2).toISOString(),
      arrivedAt: addMinutes(now, -1).toISOString(),
    },
    {
      kind: "dine_in",
      customerName: "Arjun",
      phone: "9988776655",
      partySize: 4,
      tableId: "t5",
      lines: [line("paneer-tikka", 1), line("butter-chicken", 1), line("tandoori-roti", 6), line("jeera-rice", 1)],
      status: "cooking",
      slotStart: slotAfter(15),
      acceptedAt: addMinutes(now, -8).toISOString(),
    },
    {
      kind: "booking",
      customerName: "Priya",
      phone: "9915098765",
      partySize: 2,
      tableId: "t2",
      lines: [],
      status: "new",
      slotStart: slotAfter(50),
    },
    {
      kind: "pickup",
      customerName: "Meenakshi",
      phone: "9876501234",
      lines: [line("chicken-biryani", 2), line("chaas", 2)],
      status: "new",
      slotStart: slotAfter(35),
    },
  ];
  for (const s of seeds) {
    store.seq += 1;
    const subtotal = s.lines.reduce((sum, l) => sum + l.pricePaise * l.qty, 0);
    const gateway = gatewayCharge(subtotal);
    const order: Order = {
      id: crypto.randomUUID(),
      code: `A-${String(store.seq).padStart(4, "0")}`,
      token: crypto.randomUUID(),
      slug: r.slug,
      subtotalPaise: subtotal,
      gatewayPaise: gateway,
      totalPaise: subtotal + gateway,
      platformFeePaise: s.kind === "booking" ? 0 : r.platformFeePaise,
      createdAt: addMinutes(now, -30).toISOString(),
      ...s,
    };
    store.orders.set(order.id, order);
  }
}
