"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkInAction, findOrderAction } from "@/app/actions";
import { saveOrder, savedOrders } from "@/lib/client-storage";
import { formatClock } from "@/lib/time";
import type { PublicOrder } from "@/lib/types";
import { useStore } from "./store-provider";

type State =
  | { step: "looking" }
  | { step: "choose"; orders: Array<PublicOrder & { token: string }> }
  | { step: "manual"; error?: string }
  | { step: "done"; order: PublicOrder; token: string }
  | { step: "failed"; error: string };

const ACTIVE = new Set(["new", "cooking", "ready"]);

export function CheckInView({ tableToken }: { tableToken?: string }) {
  const { restaurant: r, base } = useStore();
  const table = tableToken ? r.tables.find((t) => t.qrToken === tableToken) : undefined;
  const [state, setState] = useState<State>({ step: "looking" });
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  async function arrive(id: string, token: string) {
    const res = await checkInAction(r.slug, id, token, tableToken);
    setState(res.ok ? { step: "done", order: res.order, token } : { step: "failed", error: res.error });
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const found = await Promise.all(
        savedOrders(r.slug).map(async ({ id, token }) => {
          try {
            const res = await fetch(`/api/orders/${id}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
            return res.ok ? { ...((await res.json()) as PublicOrder), token } : null;
          } catch {
            return null;
          }
        }),
      );
      const active = found.filter((o): o is PublicOrder & { token: string } => !!o && ACTIVE.has(o.status));
      if (active.length === 1) await arrive(active[0].id, active[0].token);
      else if (active.length > 1) setState({ step: "choose", orders: active });
      else setState({ step: "manual" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-3 pt-6 pb-16">
      <p className="condensed px-1 text-sm font-bold uppercase tracking-wide text-accent">
        {r.name}
        {table && <span className="text-ink-2"> · Table {table.label}</span>}
      </p>

      <div className="ticket tear-b mt-3 rounded-t-sm px-4 pt-6">
        {state.step === "looking" && (
          <div className="py-10 text-center">
            <p className="condensed text-2xl font-bold uppercase">Finding your order…</p>
          </div>
        )}

        {state.step === "done" && <Arrived order={state.order} token={state.token} tableLabel={table?.label} base={base} />}

        {state.step === "failed" && (
          <div className="py-8 text-center">
            <p className="condensed text-2xl font-bold uppercase">Couldn&apos;t check you in</p>
            <p className="mt-2 text-sm text-ink-2">{state.error}</p>
            <button type="button" onClick={() => setState({ step: "manual" })} className="press mt-5 rounded-md border border-line px-4 py-2 text-sm font-semibold">
              Enter order code instead
            </button>
          </div>
        )}

        {state.step === "choose" && (
          <div className="pb-2">
            <p className="condensed text-2xl font-bold uppercase">Which order is this?</p>
            <ul className="mt-4 grid gap-2">
              {state.orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(() => arrive(o.id, o.token))}
                    className="press flex w-full items-center justify-between rounded-md border border-line px-4 py-3 text-left"
                  >
                    <span>
                      <span className="num block text-lg font-bold">{o.code}</span>
                      <span className="text-sm text-ink-2">{o.kind === "pickup" ? "Pickup" : `Table for ${o.partySize}`}</span>
                    </span>
                    <span className="num text-sm">{formatClock(o.slotStart)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {state.step === "manual" && (
          <ManualForm
            error={state.error}
            pending={pending}
            onSubmit={(code, last4) =>
              startTransition(async () => {
                const found = await findOrderAction(r.slug, code, last4);
                if (!found) {
                  setState({ step: "manual", error: "No order matches that code and number." });
                  return;
                }
                saveOrder(r.slug, found.id, found.token);
                await arrive(found.id, found.token);
              })
            }
          />
        )}
      </div>
    </div>
  );
}

function Arrived({ order: o, token, tableLabel, base }: { order: PublicOrder; token: string; tableLabel?: string; base: string }) {
  const where = tableLabel ?? o.arrivedTableLabel ?? (o.kind !== "pickup" ? o.tableLabel : undefined);
  const ready = o.status === "ready";
  return (
    <div className="arrived pb-2">
      <p className="condensed text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">Checked in {formatClock(o.arrivedAt!)}</p>
      <p className="condensed mt-2 text-[40px] font-extrabold uppercase leading-[0.95]">They know you&apos;re here</p>
      <p className="num mt-4 text-5xl font-bold tracking-tight text-accent">{o.code}</p>
      <p className="mt-4 text-[15px] leading-relaxed">
        {o.kind === "booking"
          ? `${where ? `${where} is yours.` : "Your table is ready."} Someone will be over with menus.`
          : where
          ? `Sit tight. ${ready ? "Your food is on its way" : "Your food comes"} to ${where}${ready ? "." : " as soon as it's off the fire."}`
          : ready
            ? "It's packed. Someone is bringing it out to you now."
            : "The kitchen is finishing it. Someone will bring it out to you, no need to queue."}
      </p>
      <Link href={`${base}/o/${o.id}?t=${token}`} className="press mt-6 inline-flex rounded-md border border-line px-4 py-2 text-sm font-semibold">
        See order
      </Link>
    </div>
  );
}

function ManualForm({ error, pending, onSubmit }: { error?: string; pending: boolean; onSubmit: (code: string, last4: string) => void }) {
  const [code, setCode] = useState("");
  const [last4, setLast4] = useState("");
  return (
    <form
      className="pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code, last4);
      }}
    >
      <p className="condensed text-2xl font-bold uppercase leading-tight">Check in with your order code</p>
      <p className="mt-1 text-sm text-ink-2">This phone doesn&apos;t have your order saved. The code is on your order page and in the payment receipt.</p>
      <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
        <label className="block rounded-md border border-line px-3 py-2 focus-within:border-accent">
          <span className="block text-xs font-medium text-ink-2">Order code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A-0412" autoCapitalize="characters" className="num w-full bg-transparent text-base uppercase outline-none" />
        </label>
        <label className="block w-32 rounded-md border border-line px-3 py-2 focus-within:border-accent">
          <span className="block text-xs font-medium text-ink-2">Mobile, last 4</span>
          <input value={last4} onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="3210" className="num w-full bg-transparent text-base outline-none" />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-alert">{error}</p>}
      <button type="submit" disabled={pending || code.trim().length < 3 || last4.length !== 4} className="press mt-4 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:opacity-45">
        {pending ? "Checking…" : "I'm here"}
      </button>
    </form>
  );
}
