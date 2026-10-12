import "server-only";
import { getOrder, getRestaurant, insertReview, listReviews } from "./store";
import type { Review, ReviewSummary } from "./types";

export type PublicReview = Omit<Review, "orderId" | "slug">;

export async function reviewsFor(slug: string): Promise<{ summary: ReviewSummary; reviews: PublicReview[] }> {
  const all = await listReviews(slug);
  const histogram: ReviewSummary["histogram"] = [0, 0, 0, 0, 0];
  for (const r of all) histogram[5 - r.rating] += 1;
  const average = all.length ? all.reduce((sum, r) => sum + r.rating, 0) / all.length : 0;
  return {
    summary: { average: Math.round(average * 10) / 10, count: all.length, histogram },
    reviews: all.map((r) => ({ id: r.id, name: r.name, rating: r.rating, text: r.text, kind: r.kind, itemIds: r.itemIds, createdAt: r.createdAt })),
  };
}

function displayName(full: string) {
  const [first, ...rest] = full.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export async function addReview(
  orderId: string,
  token: string,
  rating: number,
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const o = await getOrder(orderId);
  if (!o || o.token !== token) return { ok: false, error: "Order not found." };
  if (o.status !== "done") return { ok: false, error: "You can review once you've had the food." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "Pick 1 to 5 stars." };
  if (!(await getRestaurant(o.slug))) return { ok: false, error: "Order not found." };
  const existing = await listReviews(o.slug);
  if (existing.some((r) => r.orderId === o.id)) return { ok: false, error: "You've already reviewed this order." };
  const clean = text.trim().slice(0, 600);
  await insertReview({
    slug: o.slug,
    orderId: o.id,
    name: displayName(o.customerName),
    rating: rating as Review["rating"],
    text: clean || undefined,
    kind: o.kind,
    itemIds: o.lines.map((l) => l.itemId),
    createdAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function hasReviewed(orderId: string, slug: string) {
  return (await listReviews(slug)).some((r) => r.orderId === orderId);
}
