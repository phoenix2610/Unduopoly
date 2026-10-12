"use client";

import { useState } from "react";
import type { PublicReview } from "@/lib/reviews";
import type { ReviewSummary } from "@/lib/types";
import { Star, Stars } from "./stars";
import { useStore } from "./store-provider";

const dateFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export function ReviewCard({ review: r }: { review: PublicReview }) {
  const { restaurant } = useStore();
  const items = r.itemIds.map((id) => restaurant.items.find((i) => i.id === id)?.name).filter(Boolean);
  return (
    <article className="py-4">
      <div className="flex items-center justify-between gap-3">
        <Stars rating={r.rating} />
        <span className="text-xs text-ink-3">{dateFmt.format(new Date(r.createdAt))}</span>
      </div>
      {r.text && <p className="mt-2 text-[15px] leading-relaxed">{r.text}</p>}
      <p className="mt-2 text-xs leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">{r.name}</span> · {r.kind === "pickup" ? "Picked up" : "Ate in"} {items.join(" · ")}
      </p>
    </article>
  );
}

export function ReviewsSection({ summary, reviews }: { summary: ReviewSummary; reviews: PublicReview[] }) {
  const [all, setAll] = useState(false);
  if (summary.count === 0) return null;
  const shown = all ? reviews : reviews.slice(0, 4);
  const max = Math.max(...summary.histogram, 1);

  return (
    <section id="reviews" className="mb-3 scroll-mt-16 rounded-xl bg-paper px-4 pt-4 lg:mb-4 lg:px-5 shadow-[0_1px_2px_rgb(20_21_23/0.06)]">
      <h2 className="condensed text-xl font-bold uppercase tracking-wide">Reviews</h2>
      <p className="mt-0.5 text-sm text-ink-2">Every review here is from a paid order, and shows what they ate.</p>

      <div className="mt-4 flex items-center gap-5">
        <div className="text-center">
          <p className="num text-4xl font-bold leading-none">{summary.average.toFixed(1)}</p>
          <p className="mt-1.5">
            <Stars rating={Math.round(summary.average)} className="size-3" />
          </p>
          <p className="mt-1 text-xs text-ink-2">{summary.count} reviews</p>
        </div>
        <ul className="grid flex-1 gap-1" aria-label="Rating breakdown">
          {summary.histogram.map((n, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-ink-2">
              <span className="num flex w-5 items-center gap-0.5">
                {5 - i}
                <Star className="size-2.5" />
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-rail">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span className="num w-5 text-right">{n}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 lg:grid lg:grid-cols-2 lg:gap-x-8">
        {shown.map((r) => (
          <div key={r.id} className="border-t border-line/70 lg:[&:nth-child(-n+2)]:border-t-0">
            <ReviewCard review={r} />
          </div>
        ))}
      </div>

      {reviews.length > 4 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="press -mx-4 w-[calc(100%+2rem)] lg:-mx-5 lg:w-[calc(100%+2.5rem)] border-t border-line/70 py-3.5 text-sm font-semibold text-accent">
          {all ? "Show fewer" : `Show all ${reviews.length} reviews`}
        </button>
      )}
    </section>
  );
}
