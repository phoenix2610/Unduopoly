"use client";

import { useEffect, useRef, useState } from "react";
import { rupees } from "@/lib/money";
import type { PublicReview } from "@/lib/reviews";
import type { MenuItem } from "@/lib/types";
import { DietMark, Glyph, Stepper } from "./bits";
import { Photo } from "./photo";
import { ReviewCard } from "./reviews-section";
import { useStore } from "./store-provider";

const EXIT_MS = 200;

export function ItemSheet({ item, reviews, onClose }: { item: MenuItem; reviews: PublicReview[]; onClose: () => void }) {
  const { cart, setQty } = useStore();
  const [closing, setClosing] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ startY: number; startT: number; dy: number } | null>(null);
  const qty = cart.qty[item.id] ?? 0;
  const mentions = reviews.filter((r) => r.itemIds.includes(item.id) && r.text).slice(0, 3);

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (drag.current) return;
    drag.current = { startY: e.clientY, startT: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panel.current!.style.transition = "none";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const raw = e.clientY - drag.current.startY;
    const dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    drag.current.dy = dy;
    panel.current!.style.transform = `translateY(${dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { dy, startT } = drag.current;
    const velocity = dy / (performance.now() - startT);
    drag.current = null;
    const el = panel.current!;
    el.style.transition = "";
    if (dy > 120 || velocity > 0.11) {
      el.style.transform = "translateY(100%)";
      close();
    } else {
      el.style.transform = "";
    }
  };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={item.name} data-closing={closing || undefined}>
      <div className="sheet-backdrop absolute inset-0 bg-ink/50" onClick={close} />
      <div ref={panel} className="sheet-panel absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-xl flex-col overflow-hidden rounded-t-2xl bg-paper">
        <div className="relative shrink-0 touch-none select-none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {item.photo ? (
            <Photo photo={item.photo} sizes="(max-width: 576px) 100vw, 576px" className="aspect-[4/3] w-full" eager />
          ) : (
            <div className="h-10" />
          )}
          <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_4px_rgb(0_0_0/0.3)]" />
          <button
            ref={closeBtn}
            type="button"
            onClick={close}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Close"
            className="press absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-paper/90 text-ink shadow-sm"
          >
            <Glyph d="M4 4l8 8M12 4l-8 8" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-2.5">
            <DietMark veg={item.veg} className="mt-1.5" />
            <h2 className="flex-1 text-xl font-bold leading-snug">{item.name}</h2>
          </div>
          {item.bestseller && <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">Most ordered</p>}
          {item.description && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{item.description}</p>}
          {item.portion && <p className="mt-2 text-sm text-ink-2">{item.portion}</p>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="num text-xl font-semibold">{rupees(item.pricePaise)}</span>
            {!item.available ? (
              <span className="text-sm text-ink-3">Not available today</span>
            ) : qty > 0 ? (
              <Stepper qty={qty} onChange={(n) => setQty(item.id, n)} label={item.name} />
            ) : (
              <button type="button" onClick={() => setQty(item.id, 1)} className="press h-10 rounded-lg bg-accent px-6 font-semibold text-accent-ink">
                Add · {rupees(item.pricePaise)}
              </button>
            )}
          </div>

          {mentions.length > 0 && (
            <div className="mt-5 border-t border-line pt-3">
              <h3 className="condensed text-[13px] font-bold uppercase tracking-[0.08em] text-ink-2">People who ordered this</h3>
              <div className="divide-y divide-line/70">
                {mentions.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
