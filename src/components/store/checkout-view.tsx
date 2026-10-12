"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { placeOrderAction } from "@/app/actions";
import { saveOrder } from "@/lib/client-storage";
import { gatewayCharge, GATEWAY_RATE_BPS, rupees } from "@/lib/money";
import { addMinutes, formatClock, formatDayLabel, istNow } from "@/lib/time";
import type { Slot } from "@/lib/types";
import { DietMark, Glyph, glyphs, Stepper } from "./bits";
import { ModeChooser } from "./mode-chooser";
import { useStore } from "./store-provider";

type SlotState = { status: "loading" } | { status: "error" } | { status: "ready"; day: string; slots: Slot[] };

export function CheckoutView() {
  const store = useStore();
  const { restaurant: r, cart, lines, subtotalPaise, base, hydrated } = store;
  const router = useRouter();
  const [slots, setSlots] = useState<SlotState>({ status: "loading" });
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [placed, setPlaced] = useState(false);

  const booking = cart.kind === "booking";
  const party = cart.kind !== "pickup" ? cart.partySize : 1;

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlots({ status: "loading" });
    fetch(`/api/r/${r.slug}/slots?kind=${cart.kind}&party=${party}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { day: string; slots: Slot[] }) => {
        if (!alive) return;
        setSlots({ status: "ready", ...data });
        setSlot((current) => (data.slots.some((s) => s.start === current && s.available) ? current : null));
      })
      .catch(() => alive && setSlots({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [r.slug, cart.kind, party, hydrated]);

  const gateway = booking ? 0 : gatewayCharge(subtotalPaise);
  const total = booking ? 0 : subtotalPaise + gateway;
  const digits = phone.replace(/\D/g, "");
  const missing =
    lines.length === 0 && !booking
      ? "Add something from the menu"
      : !slot
        ? "Pick a time"
        : name.trim().length < 2
          ? "Add your name"
          : digits.length < 10
            ? "Add your mobile number"
            : null;

  function pay() {
    if (missing || !slot) return;
    setError(null);
    startTransition(async () => {
      const result = await placeOrderAction({
        slug: r.slug,
        kind: cart.kind,
        slotStart: slot,
        partySize: cart.kind !== "pickup" ? cart.partySize : undefined,
        customerName: name,
        phone,
        lines: booking ? [] : lines.map((l) => ({ itemId: l.item.id, qty: l.qty })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      saveOrder(r.slug, result.id, result.token);
      setPlaced(true);
      store.clear();
      router.push(`${base}/o/${result.id}?t=${result.token}`);
    });
  }

  if (hydrated && lines.length === 0 && !booking && !pending && !placed) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 pt-16 text-center">
        <p className="condensed text-2xl font-bold uppercase">Nothing on the ticket yet</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={base || "/"} className="press inline-flex rounded-md bg-accent px-5 py-3 font-semibold text-accent-ink">
            Back to the menu
          </Link>
          {cart.kind === "dine_in" && (
            <button type="button" onClick={() => store.setKind("booking")} className="press rounded-md border border-line px-5 py-3 font-semibold">
              Book just the table
            </button>
          )}
        </div>
      </div>
    );
  }

  const payLabel = pending
    ? booking
      ? "Booking…"
      : "Placing order…"
    : (missing ?? (booking ? "Book table" : cart.kind === "pickup" ? "Pay and place order" : "Pay and book table"));

  const bill = (
    <>
      {booking ? (
        <div className="text-sm leading-relaxed">
          <p className="font-semibold">Nothing to pay now.</p>
          <p className="mt-1 text-ink-2">You&apos;ll order and pay at {r.name}. The table is held for {r.diningMinutes} minutes from your time.</p>
        </div>
      ) : (
        <>
          <dl className="num grid gap-1.5 text-sm">
            <Row label="Food (GST incl.)" value={rupees(subtotalPaise)} />
            <Row label={`Payment gateway (${GATEWAY_RATE_BPS / 100}%)`} value={rupees(gateway)} />
            <div className="rule my-1.5" />
            <Row label="You pay" value={rupees(total)} strong />
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-2">
            Same prices as the menu inside. No packing charge, no platform fee. The gateway charge goes to the bank, not to {r.name}.
          </p>
        </>
      )}
      {slot && (
        <p className="mt-2 text-xs leading-relaxed text-ink-2">
          {booking ? "Free to cancel" : "Free cancellation"} until {formatClock(addMinutes(slot, -r.cancelCutoffMinutes))}, {r.cancelCutoffMinutes} minutes before your time.
          {!booking && " Full refund to the same account."}
        </p>
      )}
    </>
  );

  const payButton = (
    <>
      {error && (
        <p role="alert" className="mb-2 rounded-md bg-alert/10 px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={pay}
        disabled={!!missing || pending}
        className="press flex w-full items-center justify-between rounded-lg bg-accent px-4 py-3.5 font-semibold text-accent-ink disabled:opacity-45"
      >
        <span>{payLabel}</span>
        {!booking && <span className="num">{rupees(total)}</span>}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-3">Demo mode. No money is charged.</p>
    </>
  );

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-3 pb-40 lg:max-w-5xl lg:px-6 lg:pb-12">
      <div className="flex items-center justify-between px-1 pt-4 pb-3 lg:pt-6 lg:pb-4">
        <Link href={base || "/"} className="press -ml-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-ink-2">
          <Glyph d={glyphs.back} /> Menu
        </Link>
        <span className="condensed text-sm font-bold uppercase tracking-wide text-accent">{r.name}</span>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        <div className="ticket tear-b rounded-t-sm px-4 pt-4 lg:px-6 lg:pt-5">
          <ModeChooser />

          <Section title={booking ? "Food" : "Your order"}>
            {booking ? (
              <div className="text-sm leading-relaxed text-ink-2">
                <p>You&apos;ll order at the table.</p>
                {lines.length > 0 && (
                  <p className="mt-2">
                    The {itemCountLabel(lines)} in your cart won&apos;t be ordered with a table-only booking.{" "}
                    <button type="button" onClick={() => store.setKind("dine_in")} className="font-semibold text-accent underline underline-offset-2">
                      Pre-order them instead
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <ul>
                {lines.map(({ item, qty }, i) => (
                  <li key={item.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? "rule" : ""}`}>
                    <DietMark veg={item.veg} />
                    <span className="min-w-0 flex-1 text-[15px] leading-snug">{item.name}</span>
                    <Stepper size="sm" qty={qty} onChange={(n) => store.setQty(item.id, n)} label={item.name} />
                    <span className="num w-[72px] text-right text-sm">{rupees(item.pricePaise * qty)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={cart.kind === "pickup" ? "Ready at" : "Table at"}>
            {cart.kind !== "pickup" && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px]">People</span>
                <div className="flex items-center gap-3">
                  <button type="button" className="press grid size-9 place-items-center rounded-md border border-line" onClick={() => store.setPartySize(cart.partySize - 1)} aria-label="Fewer people" disabled={cart.partySize <= 1}>
                    <Glyph d="M4 8h8" />
                  </button>
                  <span className="num w-6 text-center text-lg font-semibold">{cart.partySize}</span>
                  <button type="button" className="press grid size-9 place-items-center rounded-md border border-line" onClick={() => store.setPartySize(cart.partySize + 1)} aria-label="More people" disabled={cart.partySize >= 12}>
                    <Glyph d="M4 8h8M8 4v8" />
                  </button>
                </div>
              </div>
            )}
            <SlotPicker state={slots} value={slot} onChange={setSlot} />
          </Section>

          <Section title="Your details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" hint={cart.kind === "pickup" ? "Staff will look for this name" : "The table is booked under this name"}>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={60} className="w-full bg-transparent text-base outline-none focus-visible:outline-none" placeholder="Your name" />
              </Field>
              <Field label="Mobile" hint="Only if the restaurant needs to reach you">
                <div className="flex items-center gap-2">
                  <span className="num text-sm text-ink-3">+91</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel-national" maxLength={14} className="num w-full bg-transparent text-base outline-none focus-visible:outline-none" placeholder="98765 43210" />
                </div>
              </Field>
            </div>
          </Section>

          <div className="lg:hidden">
            <Section title={booking ? "Payment" : "Bill"}>{bill}</Section>
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-6 lg:block">
          <div className="ticket tear-b rounded-t-sm px-5 pt-5">
            <h2 className="condensed mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">{booking ? "Payment" : "Bill"}</h2>
            {bill}
            <div className="mt-5 mb-2">{payButton}</div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-desk/95 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden">
        <div className="mx-auto max-w-xl">{payButton}</div>
      </div>
    </div>
  );
}

function itemCountLabel(lines: Array<{ qty: number }>) {
  const n = lines.reduce((sum, l) => sum + l.qty, 0);
  return n === 1 ? "1 dish" : `${n} dishes`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rule mt-5 pt-4 first:mt-4">
      <h2 className="condensed mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-md border border-line px-3 py-2 focus-within:border-accent">
      <span className="block text-xs font-medium text-ink-2">{label}</span>
      <span className="mt-0.5 block">{children}</span>
      <span className="mt-1 block text-[11px] text-ink-3">{hint}</span>
    </label>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-bold" : "text-ink-2"}`}>
      <dt className="font-sans">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SlotPicker({ state, value, onChange }: { state: SlotState; value: string | null; onChange: (s: string) => void }) {
  if (state.status === "loading") {
    return <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-md bg-rail" />)}</div>;
  }
  if (state.status === "error") return <p className="text-sm text-alert">Couldn&apos;t load times. Refresh to try again.</p>;
  if (state.slots.length === 0) return <p className="text-sm text-ink-2">No more slots today. Check back tomorrow.</p>;

  const groups = PARTS.map((part) => ({
    ...part,
    slots: state.slots.filter((s) => {
      const m = istNow(new Date(s.start)).minutes;
      return m >= part.from && m < part.to;
    }),
  })).filter((g) => g.slots.length > 0);

  return (
    <div>
      <p className="mb-3 text-sm font-medium">{formatDayLabel(state.day)}</p>
      <div className="grid gap-4">
        {groups.map((g) => (
          <div key={g.name}>
            <p className="mb-1.5 text-xs text-ink-2">
              {g.name} <span className="text-ink-3">· {g.hint}</span>
            </p>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-8" role="radiogroup" aria-label={`${g.name} times`}>
              {g.slots.map((s) => {
                const on = s.start === value;
                return (
                  <button
                    key={s.start}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={formatClock(s.start) + (s.available ? "" : ", full")}
                    disabled={!s.available}
                    onClick={() => onChange(s.start)}
                    className={`press num h-10 rounded-md text-[13px] ${
                      on
                        ? "bg-accent font-semibold text-accent-ink"
                        : s.available
                          ? "border border-line"
                          : "text-ink-3 line-through decoration-1"
                    }`}
                  >
                    {formatClock(s.start).replace(/ [ap]m$/, "")}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const PARTS = [
  { name: "Lunch", hint: "till 3 pm", from: 0, to: 15 * 60 },
  { name: "Afternoon", hint: "3 to 7 pm", from: 15 * 60, to: 19 * 60 },
  { name: "Dinner", hint: "7 pm onwards", from: 19 * 60, to: 24 * 60 },
];
