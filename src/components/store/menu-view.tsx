"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { rupees } from "@/lib/money";
import type { PublicReview } from "@/lib/reviews";
import { formatMinutesOfDay, istNow } from "@/lib/time";
import type { MenuItem, ReviewSummary } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { DietMark, Glyph, glyphs, Stepper } from "./bits";
import { ModeChooser } from "./mode-chooser";
import { ItemSheet } from "./item-sheet";
import { Photo } from "./photo";
import { ReviewsSection } from "./reviews-section";
import { Star } from "./stars";
import { useStore } from "./store-provider";

export function MenuView({ summary, reviews }: { summary: ReviewSummary; reviews: PublicReview[] }) {
  const { restaurant: r, cart, itemCount, subtotalPaise, hydrated, base } = useStore();
  const now = useNow();
  const minutes = now ? istNow(now).minutes : null;
  const open = minutes !== null && minutes >= r.opensAt && minutes < r.closesAt;
  const [vegOnly, setVegOnly] = useState(false);
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const active = useActiveCategory(r.categories.map((c) => c.id));

  const sections = r.categories
    .map((c) => ({ ...c, items: r.items.filter((i) => i.categoryId === c.id && (!vegOnly || i.veg)) }))
    .filter((c) => c.items.length > 0);
  const popular = r.items.filter((i) => i.bestseller && i.available && (!vegOnly || i.veg));

  return (
    <div className="flex-1 pb-32 lg:pb-12">
      {r.demo && (
        <p className="bg-ink px-4 py-1.5 text-center text-xs text-paper/85">Demo restaurant. Orders, reviews and payments are samples.</p>
      )}

      <div className="mx-auto w-full max-w-xl lg:max-w-6xl lg:px-6 lg:pt-6">
        <header className="relative overflow-hidden lg:rounded-2xl">
          {r.cover && (
            <Photo photo={r.cover} sizes="(max-width: 576px) 100vw, (max-width: 1024px) 576px, 1104px" className="aspect-[16/9] max-h-[240px] w-full lg:aspect-auto lg:h-[300px] lg:max-h-none" eager />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3.5 lg:px-8 lg:pb-7">
            <h1 className="condensed text-[42px] font-extrabold uppercase leading-[0.88] tracking-tight text-white lg:text-[72px]">{r.name}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-white/90">
              <span>{r.area} · North Indian, tandoor</span>
              {summary.count > 0 && (
                <a href="#reviews" className="flex items-center gap-1 font-semibold text-white">
                  <Star className="size-3.5" />
                  <span className="num">{summary.average.toFixed(1)}</span>
                  <span className="font-normal text-white/80 underline decoration-white/40 underline-offset-2">{summary.count} reviews</span>
                </a>
              )}
              <span className="text-white/80">
                {minutes === null ? "\u00a0" : open ? `Open till ${formatMinutesOfDay(r.closesAt)}` : `Closed, opens ${formatMinutesOfDay(r.opensAt)}`}
              </span>
            </p>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:pt-6">
          <div className="min-w-0">
            <div className="px-4 pt-3 pb-4 lg:hidden">
              <ModeChooser />
            </div>

            {popular.length > 0 && (
              <section className="pb-4 lg:pb-6" aria-label="Most ordered">
                <h2 className="condensed px-4 pb-2 text-lg font-bold uppercase tracking-wide lg:px-0">Most ordered</h2>
                <div className="scroll-x flex snap-x snap-mandatory gap-3 scroll-px-4 px-4 pb-1 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0">
                  {popular.map((item) => (
                    <PopularCard key={item.id} item={item} onOpen={() => setSheetItem(item)} />
                  ))}
                </div>
              </section>
            )}

            <nav className="sticky top-0 z-10 border-y border-line bg-desk/95 backdrop-blur-sm lg:rounded-lg lg:border" aria-label="Menu sections">
              <div className="scroll-x flex gap-1 px-3 py-2">
                {sections.map((c) => (
                  <a
                    key={c.id}
                    href={`#${c.id}`}
                    className={`press shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ${active === c.id ? "bg-ink text-paper" : "text-ink-2"}`}
                  >
                    {c.name}
                  </a>
                ))}
                <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 text-sm text-ink-2">
                  <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="size-4 accent-[var(--color-veg)]" />
                  Veg only
                </label>
              </div>
            </nav>

            <main className="px-3 pt-3 lg:px-0 lg:pt-4">
              {sections.map((c) => (
                <section key={c.id} id={c.id} data-category={c.id} className="mb-3 scroll-mt-16 rounded-xl bg-paper px-4 pt-3 shadow-[0_1px_2px_rgb(20_21_23/0.06)] lg:mb-4 lg:px-5">
                  <h2 className="condensed flex items-baseline justify-between text-xl font-bold uppercase tracking-wide">
                    {c.name}
                    <span className="num text-xs font-normal text-ink-3">{c.items.length}</span>
                  </h2>
                  <ul className="lg:grid lg:grid-cols-2 lg:gap-x-6">
                    {c.items.map((item) => (
                      <ItemRow key={item.id} item={item} onOpen={() => setSheetItem(item)} />
                    ))}
                  </ul>
                </section>
              ))}

              <ReviewsSection summary={summary} reviews={reviews} />

              <section className="mb-3 rounded-xl bg-paper px-4 py-4 text-sm shadow-[0_1px_2px_rgb(20_21_23/0.06)] lg:px-5" aria-label="Find us">
                <h2 className="condensed text-xl font-bold uppercase tracking-wide">Find us</h2>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt className="text-ink-2">Where</dt>
                  <dd>
                    {r.area}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.area}`)}`}
                      target="_blank"
                      rel="noopener"
                      className="ml-2 font-semibold text-accent"
                    >
                      Directions
                    </a>
                  </dd>
                  <dt className="text-ink-2">Hours</dt>
                  <dd className="num">
                    {formatMinutesOfDay(r.opensAt)} – {formatMinutesOfDay(r.closesAt)}, every day
                  </dd>
                  <dt className="text-ink-2">Call</dt>
                  <dd>
                    <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="num underline decoration-line underline-offset-2">
                      {r.phone}
                    </a>
                  </dd>
                </dl>
              </section>

              <p className="px-1 pt-2 pb-6 text-center text-xs leading-relaxed text-ink-3">
                Same prices as the menu inside. GST included.
                <br />
                Ordering by <span className="font-semibold text-ink-2">Unduopoly</span> · Photos from{" "}
                <a href="https://www.pexels.com" target="_blank" rel="noopener" className="underline underline-offset-2">
                  Pexels
                </a>
              </p>
            </main>
          </div>

          <aside className="hidden lg:block" aria-label="Your order">
            <div className="sticky top-6">
              <OrderPanel />
            </div>
          </aside>
        </div>
      </div>

      {hydrated && (itemCount > 0 || cart.kind === "booking") && (
        <div className="cart-bar fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
          <Link
            href={`${base}/checkout`}
            className="press mx-auto flex max-w-xl items-center justify-between rounded-lg bg-accent px-4 py-3.5 text-accent-ink shadow-[0_8px_24px_-8px_rgb(20_21_23/0.45)]"
          >
            <span className="num text-sm">
              {cart.kind === "booking" ? "Table only" : `${itemCount} ${itemCount === 1 ? "item" : "items"} · ${rupees(subtotalPaise)}`}
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              {cta(cart.kind)}
              <Glyph d={glyphs.next} />
            </span>
          </Link>
        </div>
      )}

      {sheetItem && <ItemSheet key={sheetItem.id} item={sheetItem} reviews={reviews} onClose={() => setSheetItem(null)} />}
    </div>
  );
}

function cta(kind: string) {
  return kind === "pickup" ? "Pick a pickup time" : "Pick a table time";
}

function OrderPanel() {
  const { cart, lines, itemCount, subtotalPaise, setQty, base, hydrated } = useStore();
  const ready = cart.kind === "booking" || itemCount > 0;
  return (
    <div className="rounded-xl bg-paper p-4 shadow-[0_1px_2px_rgb(20_21_23/0.06),0_12px_32px_-16px_rgb(20_21_23/0.25)]">
      <h2 className="condensed mb-3 text-xl font-bold uppercase tracking-wide">Your order</h2>
      <ModeChooser />

      <div className="mt-4 border-t border-line pt-3">
        {!hydrated ? (
          <div className="h-16" />
        ) : lines.length > 0 ? (
          <ul className="max-h-[40vh] overflow-y-auto">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className="flex items-center gap-2.5 py-2">
                <DietMark veg={item.veg} />
                <span className="min-w-0 flex-1 text-sm leading-snug">{item.name}</span>
                <Stepper size="sm" qty={qty} onChange={(n) => setQty(item.id, n)} label={item.name} />
                <span className="num w-14 text-right text-sm">{rupees(item.pricePaise * qty)}</span>
              </li>
            ))}
          </ul>
        ) : cart.kind === "booking" ? (
          <p className="py-2 text-sm leading-relaxed text-ink-2">No food needed. You&apos;ll order at the table. Add dishes now if you want them ready when you sit.</p>
        ) : (
          <p className="py-2 text-sm leading-relaxed text-ink-2">Nothing yet. Add dishes from the menu.</p>
        )}
      </div>

      {lines.length > 0 && cart.kind !== "booking" && (
        <div className="mt-2 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-ink-2">Food (GST incl.)</span>
          <span className="num font-semibold">{rupees(subtotalPaise)}</span>
        </div>
      )}

      {ready ? (
        <Link href={`${base}/checkout`} className="press mt-4 flex items-center justify-between rounded-lg bg-accent px-4 py-3 font-semibold text-accent-ink">
          {cta(cart.kind)}
          <Glyph d={glyphs.next} />
        </Link>
      ) : (
        <span className="mt-4 block rounded-lg bg-rail px-4 py-3 text-center text-sm font-semibold text-ink-3">{cta(cart.kind)}</span>
      )}
      <p className="mt-2 text-center text-xs text-ink-3">Same prices as the menu inside.</p>
    </div>
  );
}

function AddControl({ item, compact }: { item: MenuItem; compact?: boolean }) {
  const { cart, setQty } = useStore();
  const qty = cart.qty[item.id] ?? 0;
  if (!item.available) return <span className="text-xs text-ink-3">Not today</span>;
  if (qty > 0) return <Stepper size={compact ? "sm" : "md"} qty={qty} onChange={(n) => setQty(item.id, n)} label={item.name} />;
  return (
    <button
      type="button"
      onClick={() => setQty(item.id, 1)}
      aria-label={`Add ${item.name}`}
      className={`press rounded-md border-[1.5px] border-accent bg-paper font-semibold text-accent shadow-[0_2px_6px_-2px_rgb(20_21_23/0.25)] ${compact ? "h-8 w-[84px] text-sm lg:w-[68px]" : "h-9 w-[96px] text-sm"}`}
    >
      Add
    </button>
  );
}

function ItemRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <li className="flex gap-3 border-t border-line/70 py-3.5 first:border-t-0 lg:[&:nth-child(2)]:border-t-0">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left" aria-label={`${item.name}, details`}>
        <span className="flex items-center gap-2">
          <DietMark veg={item.veg} />
          {item.bestseller && <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Most ordered</span>}
        </span>
        <span className={`mt-1.5 block text-[16px] font-semibold leading-snug ${item.available ? "" : "text-ink-3 line-through decoration-1"}`}>{item.name}</span>
        <span className="num mt-1 block text-sm">{rupees(item.pricePaise)}</span>
        {item.description && <span className="mt-1.5 line-clamp-2 block text-sm leading-snug text-ink-2">{item.description}</span>}
        {item.portion && <span className="mt-1 block text-xs text-ink-3">{item.portion}</span>}
      </button>

      <div className="relative flex w-[108px] shrink-0 flex-col items-center">
        {item.photo ? (
          <>
            <button type="button" onClick={onOpen} className="press block overflow-hidden rounded-xl" tabIndex={-1} aria-hidden>
              <Photo photo={item.photo} sizes="108px" className={`size-[108px] ${item.available ? "" : "grayscale"}`} />
            </button>
            <div className="-mt-4">
              <AddControl item={item} />
            </div>
          </>
        ) : (
          <div className="pt-1">
            <AddControl item={item} />
          </div>
        )}
      </div>
    </li>
  );
}

function PopularCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <div className="w-[140px] shrink-0 snap-start lg:flex lg:w-auto lg:gap-3 lg:rounded-xl lg:bg-paper lg:p-2.5 lg:shadow-[0_1px_2px_rgb(20_21_23/0.06)]">
      <button type="button" onClick={onOpen} className="press block w-full shrink-0 lg:w-auto" aria-label={`${item.name}, details`}>
        {item.photo && <Photo photo={item.photo} sizes="(max-width: 1024px) 140px, 80px" className="aspect-square w-full rounded-xl lg:size-[80px] lg:rounded-lg" />}
      </button>
      <div className="lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:justify-between">
        <button type="button" onClick={onOpen} className="mt-2 flex items-start gap-1.5 text-left lg:mt-0.5" tabIndex={-1}>
          <DietMark veg={item.veg} className="mt-[3px]" />
          <span className="line-clamp-2 min-h-[2lh] text-sm font-semibold leading-snug">{item.name}</span>
        </button>
        <div className="mt-1.5 flex items-center justify-between gap-2 lg:mt-1">
          <span className="num text-sm">{rupees(item.pricePaise)}</span>
          <AddControl item={item} compact />
        </div>
      </div>
    </div>
  );
}

function useActiveCategory(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  const visible = useRef(new Map<string, boolean>());
  const key = ids.join(",");

  useEffect(() => {
    const seen = visible.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set((e.target as HTMLElement).dataset.category!, e.isIntersecting);
        const first = key.split(",").find((id) => seen.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-64px 0px -55% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-category]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}
