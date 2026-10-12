"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addReviewAction, cancelOrderAction } from "@/app/actions";
import { saveOrder, savedOrders } from "@/lib/client-storage";
import { rupees } from "@/lib/money";
import { formatClock, formatDayLabel, minutesBetween } from "@/lib/time";
import type { PublicOrder } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { DietMark, Glyph, glyphs } from "./bits";
import { useStore } from "./store-provider";
import { Star } from "./stars";
import { useOrder } from "./use-order";

export function OrderView({ id }: { id: string }) {
  const { restaurant: r, base } = useStore();
  const [token, setToken] = useState<string | null>(null);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("t");
    const t = fromUrl ?? savedOrders(r.slug).find((o) => o.id === id)?.token ?? null;
    if (fromUrl) saveOrder(r.slug, id, fromUrl);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(t);
    setNoToken(!t);
  }, [id, r.slug]);

  const { order, missing, setOrder } = useOrder(id, token);

  if (noToken || missing) {
    return (
      <Shell base={base} name={r.name}>
        <div className="ticket tear-b rounded-t-sm px-4 py-8 text-center">
          <p className="condensed text-2xl font-bold uppercase">Order not found on this phone</p>
          <p className="mt-2 text-sm text-ink-2">Open the link from the phone that placed the order.</p>
        </div>
      </Shell>
    );
  }
  if (!order) {
    return (
      <Shell base={base} name={r.name}>
        <div className="ticket tear-b h-80 animate-pulse rounded-t-sm" />
      </Shell>
    );
  }
  return (
    <Shell base={base} name={r.name}>
      <OrderTicket order={order} token={token!} onCancelled={setOrder} />
    </Shell>
  );
}

function Shell({ base, name, children }: { base: string; name: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-3 pb-16">
      <div className="flex items-center justify-between px-1 pt-4 pb-3">
        <Link href={base || "/"} className="press -ml-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-ink-2">
          <Glyph d={glyphs.back} /> Menu
        </Link>
        <span className="condensed text-sm font-bold uppercase tracking-wide text-accent">{name}</span>
      </div>
      {children}
    </div>
  );
}

function OrderTicket({ order: o, token, onCancelled }: { order: PublicOrder; token: string; onCancelled: (o: PublicOrder) => void }) {
  const { restaurant: r, base } = useStore();
  const now = useNow(15_000);
  const pickup = o.kind === "pickup";
  const booking = o.kind === "booking";
  const cancelled = o.status === "cancelled";

  const steps = booking
    ? [
        { label: "Table booked", at: o.createdAt },
        { label: "You arrived", at: o.arrivedAt },
        { label: "Seated", at: o.doneAt },
      ]
    : [
        { label: pickup ? "Paid" : "Paid, table booked", at: o.createdAt },
        { label: "Kitchen started", at: o.acceptedAt },
        { label: pickup ? "Packed and waiting" : "Ready to serve", at: o.readyAt },
        { label: pickup ? "Collected" : "Served", at: o.doneAt },
      ];
  const current = steps.findLastIndex((s) => s.at);

  return (
    <div className="ticket tear-b rounded-t-sm px-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="condensed text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">{pickup ? "Pickup" : booking ? `Table for ${o.partySize}, booking only` : `Table for ${o.partySize} + food`}</p>
          <p className="num mt-1 text-[40px] font-bold leading-none tracking-tight">{o.code}</p>
          <p className="mt-2 text-sm text-ink-2">{o.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-2">{pickup ? "Ready at" : "Table at"}</p>
          <p className="num mt-1 text-xl font-semibold">{formatClock(o.slotStart)}</p>
          <p className="text-xs text-ink-2">
            {formatDayLabel(o.slotStart)}
            {o.tableLabel && <> · {o.tableLabel}</>}
          </p>
        </div>
      </div>

      {cancelled ? (
        <p className="mt-5 rounded-md bg-rail px-3 py-3 text-sm">
          {booking ? (
            <span className="font-semibold">Booking cancelled.</span>
          ) : (
            <>
              <span className="font-semibold">Cancelled.</span> The full {rupees(o.totalPaise)} goes back to the account you paid from, usually within 5 to 7 working days.
            </>
          )}
        </p>
      ) : (
        <>
          <ArrivalNote order={o} base={base} now={now} />
          <ol className="mt-5 grid gap-0">
            {steps.map((s, i) => {
              const done = i <= current;
              return (
                <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < steps.length - 1 && (
                    <span aria-hidden className={`absolute top-5 left-[9px] h-[calc(100%-16px)] w-px ${i < current ? "bg-accent" : "bg-line"}`} />
                  )}
                  <span className={`relative grid size-[19px] shrink-0 place-items-center rounded-full border-[1.5px] ${done ? "border-accent bg-accent text-accent-ink" : "border-line bg-paper"}`}>
                    {done && <Glyph d={glyphs.check} className="size-3" />}
                  </span>
                  <span className={`flex-1 text-[15px] leading-[19px] ${done ? "font-medium" : "text-ink-3"}`}>{s.label}</span>
                  {s.at && <span className="num text-xs leading-[19px] text-ink-2">{formatClock(s.at)}</span>}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {booking ? (
        <p className="rule mt-5 pt-4 text-sm leading-relaxed text-ink-2">Nothing paid online. You&apos;ll order and pay at the table.</p>
      ) : (
      <div className="rule mt-5 pt-4">
        <ul className="grid gap-2">
          {o.lines.map((l) => (
            <li key={l.itemId} className="flex items-center gap-3 text-sm">
              <DietMark veg={l.veg} />
              <span className="num w-6 text-ink-2">{l.qty}×</span>
              <span className="flex-1">{l.name}</span>
              <span className="num">{rupees(l.pricePaise * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="num rule mt-3 grid gap-1 pt-3 text-sm">
          <div className="flex justify-between text-ink-2">
            <dt className="font-sans">Food (GST incl.)</dt>
            <dd>{rupees(o.subtotalPaise)}</dd>
          </div>
          <div className="flex justify-between text-ink-2">
            <dt className="font-sans">Payment gateway</dt>
            <dd>{rupees(o.gatewayPaise)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt className="font-sans">Paid</dt>
            <dd>{rupees(o.totalPaise)}</dd>
          </div>
        </dl>
      </div>
      )}

      {o.status === "done" && <ReviewPrompt order={o} token={token} />}
      {!cancelled && <CancelBlock order={o} token={token} now={now} onCancelled={onCancelled} />}

      <p className="rule mt-5 pt-4 pb-1 text-xs text-ink-2">
        {r.name} · {r.area} ·{" "}
        <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="underline underline-offset-2">
          {r.phone}
        </a>
      </p>
    </div>
  );
}

function ArrivalNote({ order: o, base, now }: { order: PublicOrder; base: string; now: Date | null }) {
  if (o.status === "done") return null;
  if (o.arrivedAt) {
    const where = o.arrivedTableLabel ?? o.tableLabel;
    return (
      <div className="mt-5 rounded-md bg-accent px-3 py-3 text-accent-ink">
        <p className="font-semibold">They know you&apos;re here.</p>
        <p className="mt-0.5 text-sm opacity-90">
          Checked in {formatClock(o.arrivedAt)}
          {o.kind === "booking"
            ? `. ${where ? `${where} is yours.` : "Your table is ready."} Someone will bring menus.`
            : where
              ? `. Bringing it to ${where}.`
              : ". Someone will bring it out to you."}
        </p>
      </div>
    );
  }
  const minsAway = now ? minutesBetween(now, o.slotStart) : null;
  return (
    <div className="mt-5 rounded-md border-[1.5px] border-dashed border-accent px-3 py-3">
      <p className="font-semibold">When you get there, scan the QR {o.kind === "pickup" ? "at the entrance" : o.tableLabel ? `at the entrance or on ${o.tableLabel}` : "at the entrance"}.</p>
      <p className="mt-0.5 text-sm text-ink-2">
        No queue. Scanning tells {o.kind === "booking" ? "the staff" : "the kitchen"} you&apos;ve arrived.
        {minsAway !== null && minsAway > 0 && ` Your slot is in ${minsAway} min.`}
      </p>
      <Link href={`${base}/here`} className="mt-2 inline-block text-xs text-ink-3 underline underline-offset-2">
        Demo: pretend to scan the entrance QR
      </Link>
    </div>
  );
}

function CancelBlock({ order: o, token, now, onCancelled }: { order: PublicOrder; token: string; now: Date | null; onCancelled: (o: PublicOrder) => void }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancellable = (o.status === "new" || o.status === "cooking") && now !== null && now < new Date(o.canCancelUntil);
  if (o.status === "done") return null;

  if (!cancellable) {
    return now ? (
      <p className="rule mt-5 pt-4 text-xs text-ink-2">Free cancellation closed at {formatClock(o.canCancelUntil)}. Call the restaurant if plans change.</p>
    ) : null;
  }

  return (
    <div className="rule mt-5 pt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!armed) {
            setArmed(true);
            return;
          }
          startTransition(async () => {
            const res = await cancelOrderAction(o.id, token);
            if (res.ok) onCancelled({ ...o, status: "cancelled" });
            else setError(res.error ?? "Couldn't cancel.");
            setArmed(false);
          });
        }}
        className={`press w-full rounded-md px-4 py-2.5 text-sm font-semibold ${armed ? "bg-alert text-white" : "border border-line text-ink-2"}`}
      >
        {pending
          ? "Cancelling…"
          : armed
            ? o.kind === "booking"
              ? "Tap again to cancel booking"
              : `Tap again to cancel and refund ${rupees(o.totalPaise)}`
            : o.kind === "booking"
              ? "Cancel booking"
              : "Cancel order"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-3">
        {o.kind === "booking" ? "Free to cancel" : "Full refund"} until {formatClock(o.canCancelUntil)}
      </p>
      {error && <p className="mt-2 text-center text-sm text-alert">{error}</p>}
    </div>
  );
}

function ReviewPrompt({ order: o, token }: { order: PublicOrder; token: string }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(o.reviewed ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return <p className="rule mt-5 pt-4 text-sm text-ink-2">Thanks for the review. It shows on the menu with what you ordered.</p>;
  }

  return (
    <form
      className="rule mt-5 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await addReviewAction(o.id, token, rating, text);
          if (res.ok) setSent(true);
          else setError(res.error);
        });
      }}
    >
      <p className="font-semibold">How was it?</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className="press grid size-10 place-items-center rounded-md text-accent"
          >
            <Star filled={n <= rating} className="size-7" />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={600}
            rows={3}
            placeholder="What was good, what wasn't? (optional)"
            className="mt-3 w-full rounded-md border border-line px-3 py-2 text-[15px] outline-none focus:border-accent focus-visible:outline-none"
          />
          {error && <p className="mt-2 text-sm text-alert">{error}</p>}
          <button type="submit" disabled={pending} className="press mt-2 w-full rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink disabled:opacity-45">
            {pending ? "Posting…" : "Post review"}
          </button>
          <p className="mt-2 text-center text-xs text-ink-3">Shown as your first name and initial, with what you ordered.</p>
        </>
      )}
    </form>
  );
}
