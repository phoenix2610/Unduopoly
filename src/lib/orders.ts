import "server-only";
import { gatewayCharge } from "./money";
import { hasReviewed } from "./reviews";
import { addDays, addMinutes, istDate, istNow, minutesBetween, type IstDay } from "./time";
import { getOrder, getRestaurant, insertOrder, listOrders, updateOrder } from "./store";
import { isTableKind, type BoardOrder, type Order, type OrderKind, type OrderStatus, type PublicOrder, type Restaurant, type Slot } from "./types";

const LAST_SEATING_BEFORE_CLOSE = 60;
const live = (o: Order) => o.status !== "cancelled";

function slotStartsFor(r: Restaurant, kind: OrderKind, day: IstDay, nowMinutes: number | null): number[] {
  const last = kind === "pickup" ? r.closesAt - r.slotMinutes : r.closesAt - LAST_SEATING_BEFORE_CLOSE;
  let first = r.opensAt;
  if (nowMinutes !== null) {
    const earliest = Math.ceil((nowMinutes + r.leadMinutes) / r.slotMinutes) * r.slotMinutes;
    first = Math.max(first, earliest);
  }
  const starts: number[] = [];
  for (let m = first; m <= last; m += r.slotMinutes) starts.push(m);
  return starts;
}

function pickupHasRoom(r: Restaurant, orders: Order[], start: string): boolean {
  const taken = orders.filter((o) => live(o) && o.kind === "pickup" && o.slotStart === start).length;
  return taken < r.maxPickupsPerSlot;
}

function freeTable(r: Restaurant, orders: Order[], start: string, partySize: number) {
  const end = addMinutes(start, r.diningMinutes);
  const busy = new Set(
    orders
      .filter((o) => live(o) && isTableKind(o.kind) && o.tableId)
      .filter((o) => {
        const oStart = new Date(o.slotStart);
        const oEnd = addMinutes(oStart, r.diningMinutes);
        return oStart < end && new Date(start) < oEnd;
      })
      .map((o) => o.tableId),
  );
  return [...r.tables].sort((a, b) => a.seats - b.seats).find((t) => t.seats >= partySize && !busy.has(t.id)) ?? null;
}

export async function slotsFor(
  slug: string,
  kind: OrderKind,
  partySize: number,
  now = new Date(),
): Promise<{ day: string; slots: Slot[] } | null> {
  const r = await getRestaurant(slug);
  if (!r) return null;
  const orders = await listOrders(slug);
  const today = istNow(now);

  for (const [day, nowMinutes] of [
    [today, today.minutes],
    [addDays(today, 1), null],
  ] as const) {
    const starts = slotStartsFor(r, kind, day, nowMinutes);
    if (starts.length === 0) continue;
    const slots = starts.map((m) => {
      const start = istDate(day, m).toISOString();
      const available =
        kind === "pickup" ? pickupHasRoom(r, orders, start) : freeTable(r, orders, start, partySize) !== null;
      return { start, available };
    });
    return { day: istDate(day, 0).toISOString(), slots };
  }
  return { day: istDate(today, 0).toISOString(), slots: [] };
}

export interface PlaceOrderInput {
  slug: string;
  kind: OrderKind;
  slotStart: string;
  partySize?: number;
  customerName: string;
  phone: string;
  lines: Array<{ itemId: string; qty: number }>;
}

export type PlaceOrderResult = { ok: true; id: string; token: string } | { ok: false; error: string };

export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const r = await getRestaurant(input.slug);
  if (!r) return { ok: false, error: "This restaurant isn't taking orders right now." };

  const name = input.customerName.trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Add the name we should call out." };
  const phone = normalisePhone(input.phone);
  if (!phone) return { ok: false, error: "That doesn't look like a 10-digit mobile number." };

  const lines = [];
  for (const { itemId, qty } of input.kind === "booking" ? [] : input.lines) {
    const item = r.items.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: "Something in your order is no longer on the menu." };
    if (!item.available) return { ok: false, error: `${item.name} just went off the menu. Remove it to continue.` };
    if (!Number.isInteger(qty) || qty < 1 || qty > 30) return { ok: false, error: "Check the quantities in your order." };
    lines.push({ itemId, name: item.name, pricePaise: item.pricePaise, veg: item.veg, qty });
  }
  if (lines.length === 0 && input.kind !== "booking") return { ok: false, error: "Your order is empty." };

  const partySize = isTableKind(input.kind) ? input.partySize ?? 0 : undefined;
  if (partySize !== undefined && (partySize < 1 || partySize > 12)) {
    return { ok: false, error: "For more than 12 people, call the restaurant." };
  }

  const open = await slotsFor(r.slug, input.kind, partySize ?? 1);
  const slot = open?.slots.find((s) => s.start === input.slotStart);
  if (!slot) return { ok: false, error: "That time has passed. Pick another slot." };
  if (!slot.available) return { ok: false, error: "That slot just filled up. Pick another one." };

  let tableId: string | undefined;
  if (isTableKind(input.kind)) {
    tableId = freeTable(r, await listOrders(r.slug), input.slotStart, partySize!)?.id;
    if (!tableId) return { ok: false, error: "That slot just filled up. Pick another one." };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.pricePaise * l.qty, 0);
  const gateway = gatewayCharge(subtotal);

  const order = await insertOrder({
    token: crypto.randomUUID(),
    slug: r.slug,
    kind: input.kind,
    slotStart: input.slotStart,
    partySize,
    tableId,
    customerName: name,
    phone,
    lines,
    subtotalPaise: subtotal,
    gatewayPaise: gateway,
    totalPaise: subtotal + gateway,
    platformFeePaise: input.kind === "booking" ? 0 : r.platformFeePaise,
    status: "new",
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id: order.id, token: order.token };
}

function tableLabel(r: Restaurant, id?: string) {
  return id ? r.tables.find((t) => t.id === id)?.label : undefined;
}

export function toPublic(o: Order, r: Restaurant): PublicOrder {
  return {
    id: o.id,
    code: o.code,
    kind: o.kind,
    slotStart: o.slotStart,
    partySize: o.partySize,
    tableLabel: tableLabel(r, o.tableId),
    customerName: o.customerName,
    lines: o.lines,
    subtotalPaise: o.subtotalPaise,
    gatewayPaise: o.gatewayPaise,
    totalPaise: o.totalPaise,
    status: o.status,
    createdAt: o.createdAt,
    acceptedAt: o.acceptedAt,
    readyAt: o.readyAt,
    doneAt: o.doneAt,
    arrivedAt: o.arrivedAt,
    arrivedTableLabel: tableLabel(r, o.arrivedTableId),
    canCancelUntil: addMinutes(o.slotStart, -r.cancelCutoffMinutes).toISOString(),
  };
}

export async function getPublicOrder(id: string, token: string): Promise<PublicOrder | null> {
  const o = await getOrder(id);
  if (!o || o.token !== token) return null;
  const r = await getRestaurant(o.slug);
  return r ? { ...toPublic(o, r), reviewed: await hasReviewed(o.id, o.slug) } : null;
}

export async function boardOrders(slug: string, now = new Date()): Promise<BoardOrder[] | null> {
  const r = await getRestaurant(slug);
  if (!r) return null;
  const orders = await listOrders(slug);
  return orders
    .filter((o) => {
      if (o.status === "new" || o.status === "cooking" || o.status === "ready") return true;
      const closedAt = o.doneAt ?? o.cancelledAt;
      return closedAt !== undefined && minutesBetween(closedAt, now) < 12 * 60;
    })
    .sort((a, b) => a.slotStart.localeCompare(b.slotStart))
    .map((o) => ({ ...toPublic(o, r), phone: o.phone, platformFeePaise: o.platformFeePaise }));
}

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  new: "cooking",
  cooking: "ready",
  ready: "done",
  done: null,
  cancelled: null,
};

const STAMP: Partial<Record<OrderStatus, keyof Order>> = {
  cooking: "acceptedAt",
  ready: "readyAt",
  done: "doneAt",
};

export async function advanceOrder(slug: string, id: string, from: OrderStatus): Promise<boolean> {
  const o = await getOrder(id);
  if (!o || o.slug !== slug || o.status !== from) return false;
  const to = o.kind === "booking" ? (from === "new" ? "done" : null) : NEXT[from];
  if (!to) return false;
  const stamp = STAMP[to];
  await updateOrder(id, { status: to, ...(stamp ? { [stamp]: new Date().toISOString() } : {}) });
  return true;
}

export async function cancelOrder(id: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const o = await getOrder(id);
  if (!o || o.token !== token) return { ok: false, error: "Order not found." };
  const r = await getRestaurant(o.slug);
  if (!r) return { ok: false, error: "Order not found." };
  if (o.status === "cancelled") return { ok: true };
  if (o.status !== "new" && o.status !== "cooking") return { ok: false, error: "The kitchen has already finished this order." };
  if (new Date() > addMinutes(o.slotStart, -r.cancelCutoffMinutes)) {
    return { ok: false, error: `Cancellation closes ${r.cancelCutoffMinutes} minutes before your slot.` };
  }
  await updateOrder(id, { status: "cancelled", cancelledAt: new Date().toISOString() });
  return { ok: true };
}

export type CheckInResult =
  | { ok: true; order: PublicOrder }
  | { ok: false; error: string };

export async function checkIn(slug: string, id: string, token: string, tableToken?: string): Promise<CheckInResult> {
  const o = await getOrder(id);
  const r = await getRestaurant(slug);
  if (!o || !r || o.slug !== slug || o.token !== token) return { ok: false, error: "We couldn't find that order here." };
  if (o.status === "cancelled") return { ok: false, error: "This order was cancelled." };
  if (o.status === "done") return { ok: false, error: "This order has already been handed over." };
  const table = tableToken ? r.tables.find((t) => t.qrToken === tableToken) : undefined;
  const updated = await updateOrder(id, {
    arrivedAt: o.arrivedAt ?? new Date().toISOString(),
    arrivedTableId: table?.id ?? o.arrivedTableId,
  });
  return { ok: true, order: toPublic(updated!, r) };
}

export async function findOrderByCode(slug: string, code: string, phoneLast4: string) {
  const wanted = code.trim().toUpperCase().replace(/^A?-?/, "A-");
  const orders = await listOrders(slug);
  const o = orders.find((x) => x.code === wanted && x.phone.endsWith(phoneLast4.trim()) && live(x));
  return o ? { id: o.id, token: o.token } : null;
}
