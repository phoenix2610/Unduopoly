"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { advanceOrderAction } from "@/app/actions";
import { formatClock24, minutesBetween } from "@/lib/time";
import type { BoardOrder, OrderStatus } from "@/lib/types";
import { chimeArrival, chimeNewOrder, unlockAudio } from "./chime";

const POLL_MS = 3000;
const NAG_MS = 20_000;

const COLUMNS: Array<{ status: OrderStatus; title: string; empty: string }> = [
  { status: "new", title: "New", empty: "Nothing waiting" },
  { status: "cooking", title: "Cooking", empty: "Kitchen's clear" },
  { status: "ready", title: "Ready", empty: "Nothing on the pass" },
];

export function Board({ slug, name, qrHref }: { slug: string; name: string; qrHref: string }) {
  const [orders, setOrders] = useState<BoardOrder[] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [onShift, setOnShift] = useState(false);
  const [offline, setOffline] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const arrived = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/r/${slug}/orders`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data: { orders: BoardOrder[]; now: string } = await res.json();
      setOffline(false);
      setNow(new Date(data.now));

      if (seen.current === null) {
        seen.current = new Set(data.orders.map((o) => o.id));
        data.orders.forEach((o) => o.arrivedAt && arrived.current.add(o.id));
      } else {
        const incoming = data.orders.filter((o) => !seen.current!.has(o.id));
        const checkedIn = data.orders.filter((o) => o.arrivedAt && !arrived.current.has(o.id));
        incoming.forEach((o) => seen.current!.add(o.id));
        if (incoming.length) setFresh((prev) => new Set([...prev, ...incoming.map((o) => o.id)]));
        checkedIn.forEach((o) => arrived.current.add(o.id));
        if (incoming.length) chimeNewOrder();
        else if (checkedIn.length) chimeArrival();
      }
      setOrders(data.orders);
    } catch {
      setOffline(true);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const waiting = orders?.some((o) => o.status === "new") ?? false;
  useEffect(() => {
    if (!onShift || !waiting) return;
    const id = window.setInterval(chimeNewOrder, NAG_MS);
    return () => window.clearInterval(id);
  }, [onShift, waiting]);

  useEffect(() => {
    if (!onShift || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    acquire();
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [onShift]);

  async function advance(o: BoardOrder) {
    const next: Record<string, OrderStatus> =
      o.kind === "booking" ? { new: "done" } : { new: "cooking", cooking: "ready", ready: "done" };
    const stamp = new Date().toISOString();
    setOrders((list) =>
      list?.map((x) =>
        x.id === o.id
          ? { ...x, status: next[o.status], ...(next[o.status] === "done" ? { doneAt: stamp } : o.status === "new" ? { acceptedAt: stamp } : { readyAt: stamp }) }
          : x,
      ) ?? null,
    );
    setFresh((prev) => {
      const nextSet = new Set(prev);
      nextSet.delete(o.id);
      return nextSet;
    });
    await advanceOrderAction(slug, o.id, o.status);
    load();
  }

  const active = orders?.filter((o) => o.status === "new" || o.status === "cooking" || o.status === "ready") ?? [];
  const food = active.filter((o) => o.kind !== "booking");
  const tables = active.filter((o) => o.kind === "booking" && !o.arrivedAt);
  const here = active.filter((o) => o.arrivedAt).sort((a, b) => a.arrivedAt!.localeCompare(b.arrivedAt!));
  const closed = orders?.filter((o) => o.status === "done" || o.status === "cancelled").reverse() ?? [];

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-rail">
      <header className="flex items-center gap-4 border-b border-line bg-ink px-4 py-3 text-paper">
        <p className="condensed text-xl font-extrabold uppercase tracking-tight">{name}</p>
        <div className="num hidden gap-4 text-xs text-paper/70 sm:flex">
          {COLUMNS.map((c) => (
            <span key={c.status}>
              {c.title} {food.filter((o) => o.status === c.status).length}
            </span>
          ))}
          <span>Tables {tables.length}</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <a href={qrHref} className="press rounded border border-paper/25 px-2.5 py-1 text-xs font-semibold text-paper/85">
            QR codes
          </a>
          {offline && <span className="rounded bg-alert px-2 py-1 text-xs font-semibold">Offline, retrying</span>}
          <span className={`flex items-center gap-1.5 text-xs ${onShift ? "text-paper" : "text-paper/50"}`}>
            <span className={`size-2 rounded-full ${onShift ? "bg-[#4ade80]" : "bg-paper/40"}`} />
            {onShift ? "Sound on" : "Sound off"}
          </span>
          <span className="num text-xl font-semibold">{now ? formatClock24(now) : "--:--"}</span>
        </div>
      </header>

      {here.length > 0 && (
        <section className="border-b border-line bg-pen px-4 py-3 text-white" aria-label="Customers who have arrived">
          <p className="condensed mb-2 text-xs font-bold uppercase tracking-[0.12em] text-white/80">Here now</p>
          <div className="scroll-x flex gap-2">
            {here.map((o) => {
              const where = o.arrivedTableLabel ?? (o.kind !== "pickup" ? o.tableLabel : undefined);
              const booking = o.kind === "booking";
              return (
                <div key={o.id} className="flex shrink-0 items-center gap-3 rounded-md bg-white/12 px-3 py-2">
                  <span className="num text-lg font-bold">{o.code}</span>
                  <span className="text-sm">
                    {o.customerName}
                    <span className="block text-xs text-white/75">
                      {booking
                        ? o.arrivedTableLabel && o.tableLabel && o.arrivedTableLabel !== o.tableLabel
                          ? `Booked ${o.tableLabel}, sitting at ${o.arrivedTableLabel} · check the table`
                          : `Booked ${o.tableLabel ?? "table"} · seat them, bring menus`
                        : `${where ? `At ${where}` : "At the counter"} · ${o.status === "ready" ? "take it out" : "still cooking"}`}
                    </span>
                  </span>
                  {booking && (
                    <button type="button" onClick={() => advance(o)} className="press rounded bg-white px-3 py-1.5 text-sm font-semibold text-pen">
                      Seated
                    </button>
                  )}
                  {!booking && o.status === "ready" && (
                    <button type="button" onClick={() => advance(o)} className="press rounded bg-white px-3 py-1.5 text-sm font-semibold text-pen">
                      {o.kind === "pickup" ? "Handed over" : "Served"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tables.length > 0 && (
        <section className="border-b border-line bg-desk px-4 py-2.5" aria-label="Table bookings without food">
          <p className="condensed mb-1.5 text-xs font-bold uppercase tracking-[0.12em] text-ink-2">Tables booked · ordering at the table</p>
          <div className="scroll-x flex gap-2">
            {tables.map((o) => (
              <div key={o.id} className="flex shrink-0 items-center gap-3 rounded-md border border-line bg-paper px-3 py-1.5 text-sm">
                <span className="num font-semibold">{formatClock24(o.slotStart)}</span>
                <span>
                  {o.customerName} · {o.partySize} {o.partySize === 1 ? "person" : "people"}
                </span>
                {o.tableLabel && <span className="num rounded bg-rail px-1.5 py-0.5 text-xs font-semibold">{o.tableLabel}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      <main className="grid flex-1 gap-3 p-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const list = food.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="flex min-w-0 flex-col" aria-label={col.title}>
              <h2 className="condensed mb-2 flex items-baseline gap-2 px-1 text-sm font-bold uppercase tracking-[0.1em] text-ink-2">
                {col.title} <span className="num font-normal text-ink-3">{list.length}</span>
              </h2>
              <div className="grid content-start gap-3">
                {orders === null ? (
                  <div className="ticket h-40 animate-pulse rounded-sm" />
                ) : list.length === 0 ? (
                  <p className="rounded-sm border-[1.5px] border-dashed border-line px-3 py-6 text-center text-sm text-ink-3">{col.empty}</p>
                ) : (
                  list.map((o) => <Ticket key={o.id} order={o} now={now} fresh={fresh.has(o.id)} onAdvance={() => advance(o)} />)
                )}
              </div>
            </section>
          );
        })}
      </main>

      {closed.length > 0 && (
        <footer className="px-3 pb-4">
          <button type="button" onClick={() => setShowDone((v) => !v)} className="press rounded-md px-2 py-1 text-sm text-ink-2">
            {showDone ? "Hide" : "Show"} finished today ({closed.length})
          </button>
          {showDone && (
            <ul className="ticket num mt-2 rounded-sm px-3 py-1 text-sm">
              {closed.map((o, i) => (
                <li key={o.id} className={`flex gap-4 py-2 ${i > 0 ? "rule" : ""}`}>
                  <span className="font-semibold">{o.code}</span>
                  <span className="flex-1 font-sans">{o.customerName}</span>
                  <span className={o.status === "cancelled" ? "text-alert" : "text-ink-2"}>{o.status === "cancelled" ? "cancelled" : `done ${formatClock24(o.doneAt!)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </footer>
      )}

      {!onShift && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ink/70 p-4 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              chimeArrival();
              setOnShift(true);
            }}
            className="press ticket tear-b w-full max-w-sm rounded-t-sm px-6 pt-8 text-left"
          >
            <span className="condensed block text-4xl font-extrabold uppercase leading-none">Start shift</span>
            <span className="mt-3 block text-[15px] text-ink-2">Turns on the order bell and keeps this screen awake. Leave this tablet plugged in at the pass.</span>
            <span className="mt-6 mb-2 block rounded-md bg-pen px-4 py-3 text-center font-semibold text-white">Tap to start</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Ticket({ order: o, now, fresh, onAdvance }: { order: BoardOrder; now: Date | null; fresh: boolean; onAdvance: () => void }) {
  const due = now ? minutesBetween(now, o.slotStart) : null;
  const late = due !== null && due < 0 && o.status !== "ready";
  const where = o.arrivedTableLabel ?? o.tableLabel;
  const action = o.status === "new" ? "Accept and start" : o.status === "cooking" ? "Mark ready" : o.kind === "pickup" ? "Handed over" : "Served";

  return (
    <article className={`ticket tear-b rounded-t-sm px-3 pt-3 ${fresh ? "ticket-in" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="num text-2xl font-bold leading-none">{o.code}</p>
          <p className="mt-1 text-sm font-medium">{o.customerName}</p>
        </div>
        <div className="text-right">
          <p className="condensed text-xs font-bold uppercase tracking-wide text-ink-2">
            {o.kind === "pickup" ? "Pickup" : `Dine-in · ${o.partySize}`}
            {o.kind === "dine_in" && o.tableLabel && ` · ${o.tableLabel}`}
          </p>
          <p className="num mt-0.5 text-lg font-semibold">{formatClock24(o.slotStart)}</p>
          {due !== null && (
            <p className={`num text-xs ${late ? "font-semibold text-alert" : "text-ink-2"}`}>
              {late ? `${-due} min late` : due === 0 ? "due now" : due > 0 ? `in ${due} min` : "waiting"}
            </p>
          )}
        </div>
      </div>

      {o.arrivedAt && (
        <p className="mt-2 inline-block -rotate-1 rounded-sm border-2 border-pen px-2 py-0.5 text-sm font-extrabold uppercase tracking-wide text-pen">
          Here · {where ?? "counter"}
        </p>
      )}

      <ul className="rule num mt-3 grid gap-1 pt-2 text-[15px]">
        {o.lines.map((l) => (
          <li key={l.itemId} className="flex gap-3">
            <span className="w-6 text-right font-bold">{l.qty}</span>
            <span className="flex-1 font-sans">{l.name}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdvance}
        className={`press mt-3 mb-1 w-full rounded-md px-3 py-3 text-[15px] font-semibold ${o.status === "new" ? "bg-pen text-white" : "bg-ink text-paper"}`}
      >
        {action}
      </button>
      <a href={`tel:+91${o.phone}`} className="num mb-1 block py-1 text-center text-xs text-ink-3">
        {o.phone.slice(0, 5)} {o.phone.slice(5)}
      </a>
    </article>
  );
}
